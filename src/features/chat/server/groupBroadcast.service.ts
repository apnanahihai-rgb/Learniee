import { prisma } from "@/lib/prisma";
import { ChatSenderRole, ClassSessionStatus, type EnrollmentStatus } from "@prisma/client";

import { ChatError } from "@/features/chat/server/chat.service";
import { screenChatMessage } from "@/features/chat/utils/chatScreening";
import { isGroupType } from "@/features/courses/utils/groupClass";
import { notifyChatMessage } from "@/features/shared/server/notificationTriggers.service";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/features/shared/utils/enrollmentStatus";

/**
 * Group classes (Nov 2026): a Teacher announcement to every student of one
 * group course. One copy lands in each student's chat room (flagged
 * `isBroadcast`), so a parent's reply stays a private 1:1 chat with the
 * Teacher. Normal messages are never shared with the group.
 */

const ACTIVE_STATUSES = [...ACTIVE_ENROLLMENT_STATUSES] as EnrollmentStatus[];

async function requireOwnGroupCourse(teacherId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, teacherId: true, type: true, courseTitle: true },
  });

  if (!course) throw new ChatError("Course not found.", 404);
  if (course.teacherId !== teacherId) {
    throw new ChatError("This course doesn't belong to your account.", 403);
  }
  if (!isGroupType(course.type)) {
    throw new ChatError("Announcements are only for group classes.", 409);
  }

  return course;
}

export async function broadcastToGroup(teacherId: string, courseId: string, rawBody: string) {
  const body = (rawBody ?? "").trim();

  if (!body) throw new ChatError("Announcement can't be empty.");
  if (body.length > 4000) throw new ChatError("Announcement is too long (4000 characters max).");

  await requireOwnGroupCourse(teacherId, courseId);

  // Same rule as a normal message: no phone numbers on the platform.
  if (screenChatMessage(body, []).level === "BLOCKED") {
    throw new ChatError(
      "Your announcement wasn't sent because it appears to contain a phone number. Please keep all communication on Learniee.",
      422,
    );
  }

  const rooms = await prisma.chatRoom.findMany({
    where: {
      courseId,
      teacherId,
      enrollment: { status: { in: ACTIVE_STATUSES } },
    },
    select: { id: true },
  });

  if (rooms.length === 0) {
    throw new ChatError("No enrolled students in this group yet.", 409);
  }

  const roomIds = rooms.map((room) => room.id);

  await prisma.$transaction([
    prisma.chatMessage.createMany({
      data: roomIds.map((chatRoomId) => ({
        chatRoomId,
        senderRole: ChatSenderRole.TEACHER,
        senderId: teacherId,
        body,
        isBroadcast: true,
      })),
    }),
    prisma.chatRoom.updateMany({
      where: { id: { in: roomIds } },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  for (const roomId of roomIds) {
    try {
      await notifyChatMessage(roomId, "TEACHER");
    } catch (error) {
      console.error("Group broadcast notify error:", error);
    }
  }

  return { delivered: roomIds.length };
}

export interface GroupStudentRow {
  enrollmentId: string;
  chatRoomId: string | null;
  studentName: string;
}

/** One upcoming class of a group: ONE row however many students are in it. */
export interface GroupClassSlot {
  /** Any student's session of the class — opening it Starts / Ends the whole group. */
  sessionId: string;
  startsAt: string;
  endsAt: string;
  students: number;
}

const MAX_UPCOMING_SLOTS = 8;

/**
 * The group's coming classes, one per start time. Every student has their own
 * `ClassSession` for the same class, so rows are collapsed by `startsAt`; a
 * student who cancelled their own seat is not counted (their session is no
 * longer SCHEDULED).
 */
async function listUpcomingGroupClasses(
  teacherId: string,
  courseId: string,
): Promise<GroupClassSlot[]> {
  const rows = await prisma.classSession.findMany({
    where: {
      teacherId,
      enrollment: { courseId },
      status: ClassSessionStatus.SCHEDULED,
      cycleId: { not: null },
      endsAt: { gt: new Date() },
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    take: 400,
    select: { id: true, startsAt: true, endsAt: true },
  });

  const slots = new Map<string, GroupClassSlot>();

  for (const row of rows) {
    if (!row.startsAt || !row.endsAt) continue;

    const key = row.startsAt.toISOString();
    const slot = slots.get(key);

    if (slot) {
      slot.students += 1;
    } else {
      slots.set(key, {
        sessionId: row.id,
        startsAt: key,
        endsAt: row.endsAt.toISOString(),
        students: 1,
      });
    }
  }

  return [...slots.values()].slice(0, MAX_UPCOMING_SLOTS);
}

/** Students, announcements, upcoming classes and title for the Teacher's group page. */
export async function getTeacherGroupOverview(teacherId: string, courseId: string) {
  const course = await requireOwnGroupCourse(teacherId, courseId);

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, teacherId, status: { in: ACTIVE_STATUSES } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      student: { select: { firstName: true, lastName: true, visibleName: true } },
      chatRoom: { select: { id: true } },
    },
  });

  const students: GroupStudentRow[] = enrollments.map((row) => ({
    enrollmentId: row.id,
    chatRoomId: row.chatRoom?.id ?? null,
    studentName:
      row.student.visibleName?.trim() ||
      `${row.student.firstName} ${row.student.lastName}`.trim(),
  }));

  // Every room holds an identical copy (one INSERT, same timestamp), so one per send.
  const announcements = await prisma.chatMessage.findMany({
    where: {
      isBroadcast: true,
      senderId: teacherId,
      chatRoom: { courseId },
    },
    distinct: ["createdAt", "body"],
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, body: true, createdAt: true },
  });

  const classes = await listUpcomingGroupClasses(teacherId, courseId);

  return {
    course: { id: course.id, title: course.courseTitle },
    students,
    announcements,
    classes,
  };
}
