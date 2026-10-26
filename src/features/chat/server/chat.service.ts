import { prisma } from "@/lib/prisma";
import {
  ActivityAction,
  ActivityActorRole,
  ChatFlagLevel,
  ChatSenderRole,
} from "@prisma/client";
import { SENDABLE_ENROLLMENT_STATUSES } from "@/features/shared/utils/enrollmentStatus";
import {
  notifyAdminChatMessageFlagged,
  notifyChatMessage,
} from "@/features/shared/server/notificationTriggers.service";
import { logActivity } from "@/features/shared/server/activityLog.service";
import {
  SPLIT_LOOKBACK_MESSAGES,
  SPLIT_LOOKBACK_MINUTES,
  screenChatMessage,
} from "@/features/chat/utils/chatScreening";

export class ChatError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Enrollment statuses that still allow new messages. A rejected or
 * cancelled enrollment keeps its ChatRoom (and message history) around
 * for Admin's record, but Parent/Teacher can no longer send into it —
 * see the gating note on the ChatRoom model in schema.prisma. Shared
 * with the dual-approval workflow's status list so this never drifts
 * out of sync with what states actually exist.
 */

const roomListSelect = {
  id: true,
  lastMessageAt: true,
  createdAt: true,
  parent: {
    select: { id: true, firstName: true, lastName: true, visibleName: true },
  },
  teacher: {
    select: { id: true, firstName: true, lastName: true, visibleName: true },
  },
  student: {
    select: { id: true, firstName: true, lastName: true, visibleName: true },
  },
  course: {
    select: { id: true, courseTitle: true, subject: true },
  },
  enrollment: {
    select: { id: true, status: true, isLegacy: true },
  },
  _count: {
    select: { messages: true },
  },
} as const;

/** Every chat room a Parent is party to, most recently active first. */
export function getChatRoomsForParent(parentId: string) {
  return prisma.chatRoom.findMany({
    where: { parentId },
    select: roomListSelect,
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Every chat room a Teacher is party to — naturally one per child
 * they teach (each room maps 1:1 to an Enrollment), matching the "a
 * separate room per child" requirement.
 */
export function getChatRoomsForTeacher(teacherId: string) {
  return prisma.chatRoom.findMany({
    where: { teacherId },
    select: roomListSelect,
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
  });
}

export interface AdminChatFilters {
  teacherId?: string;
  parentId?: string;
  courseId?: string;
}

/**
 * Every chat room on the platform, optionally narrowed by
 * teacher/parent/course — Admin's "view any conversation" queue.
 * Deliberately unrestricted otherwise: Admin oversight of Parent<->
 * Teacher messaging is the whole point of this endpoint.
 *
 * Also marks `hasFlaggedMessages` (06 #31) so the Admin list/search
 * can surface rooms with a possible phone-number share without
 * opening each one. Done as a second query rather than a Prisma
 * filtered relation count so `roomListSelect` stays shared with the
 * Parent/Teacher listings, which have no reason to know about flags.
 */
export async function getChatRoomsForAdmin(filters: AdminChatFilters = {}) {
  const rooms = await prisma.chatRoom.findMany({
    where: {
      teacherId: filters.teacherId || undefined,
      parentId: filters.parentId || undefined,
      courseId: filters.courseId || undefined,
    },
    select: roomListSelect,
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
  });

  if (rooms.length === 0) {
    return [] as Array<(typeof rooms)[number] & { hasFlaggedMessages: boolean }>;
  }

  const roomIds = rooms.map((room) => room.id);
  const [flagged, safetyFlagged] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { chatRoomId: { in: roomIds }, containsPhoneNumber: true },
      select: { chatRoomId: true },
      distinct: ["chatRoomId"],
    }),
    prisma.chatSafetyFlag.findMany({
      where: { chatRoomId: { in: roomIds } },
      select: { chatRoomId: true },
      distinct: ["chatRoomId"],
    }),
  ]);
  const flaggedRoomIds = new Set([
    ...flagged.map((row) => row.chatRoomId),
    ...safetyFlagged.map((row) => row.chatRoomId),
  ]);

  return rooms.map((room) => ({
    ...room,
    hasFlaggedMessages: flaggedRoomIds.has(room.id),
  }));
}

type RoomAccess =
  | { role: "PARENT"; actorId: string }
  | { role: "TEACHER"; actorId: string }
  | { role: "ADMIN" };

/**
 * Loads a room and checks the requester is actually allowed to see
 * it: the room's own parent, the room's own teacher, or an Admin.
 * Throws ChatError(404) if the room doesn't exist, or (403) if it
 * exists but isn't this requester's.
 */
export async function getRoomForAccess(roomId: string, access: RoomAccess) {
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: { enrollment: { select: { status: true } } },
  });

  if (!room) {
    throw new ChatError("Chat room not found.", 404);
  }

  if (access.role === "PARENT" && room.parentId !== access.actorId) {
    throw new ChatError("This chat room doesn't belong to your account.", 403);
  }

  if (access.role === "TEACHER" && room.teacherId !== access.actorId) {
    throw new ChatError("This chat room doesn't belong to your account.", 403);
  }

  // ADMIN falls through with no ownership check by design.

  return room;
}

const baseMessageSelect = {
  id: true,
  chatRoomId: true,
  senderRole: true,
  senderId: true,
  body: true,
  createdAt: true,
  containsPhoneNumber: true,
} as const;

/**
 * Messages in a room, oldest first. `after` supports simple
 * polling — pass the timestamp of the last message you already have
 * and only newer ones come back (see useChatMessages.ts).
 *
 * `includeOriginal` (06 #31) additionally selects `originalBody` —
 * the unmasked text for a phone-number-flagged message. Only the
 * Admin messages route passes this; Parent/Teacher never receive the
 * real number, so the field is left off their query entirely rather
 * than fetched-then-hidden.
 */
export async function listMessages(
  roomId: string,
  after?: Date,
  options: {
    includeOriginal?: boolean;
    /**
     * Parent/Teacher routes pass who is asking so each message can say
     * whether *they* already reported it (`reportedByMe`) — the report
     * button then shows "Reported" after a reload too.
     */
    viewer?: { role: ChatSenderRole; id: string };
  } = {},
) {
  const messages = await prisma.chatMessage.findMany({
    where: {
      chatRoomId: roomId,
      createdAt: after ? { gt: after } : undefined,
    },
    orderBy: { createdAt: "asc" },
    select: options.includeOriginal
      ? { ...baseMessageSelect, originalBody: true }
      : baseMessageSelect,
  });

  if (messages.length === 0) {
    return [];
  }

  const reports = await prisma.chatMessageReport.findMany({
    where: { chatMessageId: { in: messages.map((message) => message.id) } },
    select: { chatMessageId: true, reporterRole: true, reporterId: true },
  });

  const { viewer } = options;

  return messages.map((message) => {
    const forMessage = reports.filter((report) => report.chatMessageId === message.id);

    return {
      ...message,
      reportedByMe: viewer
        ? forMessage.some(
            (report) => report.reporterRole === viewer.role && report.reporterId === viewer.id,
          )
        : false,
      // Admin only (`includeOriginal` is the Admin route's flag).
      ...(options.includeOriginal ? { reportCount: forMessage.length } : {}),
    };
  });
}

export interface SendMessageInput {
  roomId: string;
  senderRole: "PARENT" | "TEACHER";
  senderId: string;
  body: string;
}

/**
 * Sends a message into a room. Only PARENT/TEACHER can send — Admin's
 * access is view-only by design (see chat routes), so there's no
 * ADMIN case here at all rather than a role check that could be
 * loosened by accident later.
 */
export async function sendMessage(input: SendMessageInput) {
  const body = input.body.trim();

  if (!body) {
    throw new ChatError("Message can't be empty.");
  }

  if (body.length > 4000) {
    throw new ChatError("Message is too long (4000 characters max).");
  }

  const room = await prisma.chatRoom.findUnique({
    where: { id: input.roomId },
    include: { enrollment: { select: { status: true } } },
  });

  if (!room) {
    throw new ChatError("Chat room not found.", 404);
  }

  const ownerId = input.senderRole === "PARENT" ? room.parentId : room.teacherId;
  const actorId = input.senderId;

  if (ownerId !== actorId) {
    throw new ChatError("This chat room doesn't belong to your account.", 403);
  }

  if (!SENDABLE_ENROLLMENT_STATUSES.has(room.enrollment.status)) {
    throw new ChatError(
      "This enrollment was rejected or cancelled — you can no longer send messages here.",
      409,
    );
  }

  // Screening (06 #31): a clear phone number is BLOCKED (never saved,
  // never shown to the other party, Admin is told). Anything that only
  // looks like a workaround (digits as words, a number split over several
  // messages, …) is SUSPICIOUS: it is sent normally and Admin is told.
  const since = new Date(Date.now() - SPLIT_LOOKBACK_MINUTES * 60 * 1000);
  const recent = await prisma.chatMessage.findMany({
    where: {
      chatRoomId: input.roomId,
      senderRole: input.senderRole as ChatSenderRole,
      senderId: input.senderId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: SPLIT_LOOKBACK_MESSAGES,
    select: { body: true, originalBody: true },
  });

  const screening = screenChatMessage(
    body,
    recent.map((row) => row.originalBody ?? row.body),
  );

  const actorRole =
    input.senderRole === "PARENT" ? ActivityActorRole.PARENT : ActivityActorRole.TEACHER;

  if (screening.level === "BLOCKED") {
    // Reporting must never decide whether the block happens: if saving
    // the flag fails, the message is still refused.
    try {
      await prisma.chatSafetyFlag.create({
        data: {
          chatRoomId: input.roomId,
          senderRole: input.senderRole as ChatSenderRole,
          senderId: input.senderId,
          level: ChatFlagLevel.BLOCKED,
          reasons: screening.reasons,
          text: body,
          detail: screening.detail,
        },
      });

      await notifyAdminChatMessageFlagged(input.roomId, input.senderRole, "BLOCKED");

      await logActivity({
        action: ActivityAction.CHAT_PHONE_NUMBER_FLAGGED,
        actorRole,
        actorId: input.senderId,
        description: `Message with a phone number was blocked in chat room ${input.roomId}.`,
        metadata: { chatRoomId: input.roomId, level: "BLOCKED", reasons: screening.reasons },
      });
    } catch (error) {
      console.error("Chat block flag error:", error);
    }

    throw new ChatError(
      "Your message wasn't sent because it appears to contain a phone number. For everyone's safety, please keep all communication on Learniee.",
      422,
    );
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.chatMessage.create({
      data: {
        chatRoomId: input.roomId,
        senderRole: input.senderRole as ChatSenderRole,
        senderId: input.senderId,
        body,
      },
      select: baseMessageSelect,
    });

    await tx.chatRoom.update({
      where: { id: input.roomId },
      data: { lastMessageAt: new Date() },
    });

    if (screening.level === "SUSPICIOUS") {
      await tx.chatSafetyFlag.create({
        data: {
          chatRoomId: input.roomId,
          chatMessageId: created.id,
          senderRole: input.senderRole as ChatSenderRole,
          senderId: input.senderId,
          level: ChatFlagLevel.SUSPICIOUS,
          reasons: screening.reasons,
          text: body,
          detail: screening.detail,
        },
      });
    }

    return created;
  });

  await notifyChatMessage(input.roomId, input.senderRole);

  if (screening.level === "SUSPICIOUS") {
    await notifyAdminChatMessageFlagged(input.roomId, input.senderRole, "SUSPICIOUS");

    await logActivity({
      action: ActivityAction.CHAT_PHONE_NUMBER_FLAGGED,
      actorRole,
      actorId: input.senderId,
      description: `Suspicious message (possible hidden phone number) sent in chat room ${input.roomId}.`,
      metadata: {
        chatRoomId: input.roomId,
        chatMessageId: message.id,
        level: "SUSPICIOUS",
        reasons: screening.reasons,
      },
    });
  }

  return message;
}
