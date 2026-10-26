import { ChatReportStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { ChatError } from "@/features/chat/server/chat.service";
import { displayName } from "@/features/chat/types/chat";

const ADMIN_LIST_LIMIT = 200;

/**
 * Admin's queue of automatically flagged chat messages (BLOCKED phone
 * numbers and SUSPICIOUS messages), open first, newest first inside each.
 * `text` is exactly what the sender typed — Admin only.
 */
export async function listChatSafetyFlags() {
  const [rows, openCount] = await Promise.all([
    prisma.chatSafetyFlag.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: ADMIN_LIST_LIMIT,
      select: {
        id: true,
        level: true,
        reasons: true,
        text: true,
        detail: true,
        status: true,
        senderRole: true,
        createdAt: true,
        reviewedAt: true,
        chatRoomId: true,
        chatRoom: {
          select: {
            parent: { select: { id: true, firstName: true, lastName: true, visibleName: true } },
            teacher: { select: { id: true, firstName: true, lastName: true, visibleName: true } },
            course: { select: { courseTitle: true } },
          },
        },
      },
    }),
    prisma.chatSafetyFlag.count({ where: { status: ChatReportStatus.OPEN } }),
  ]);

  const flags = rows.map((row) => ({
    id: row.id,
    level: row.level,
    reasons: row.reasons,
    text: row.text,
    detail: row.detail,
    status: row.status,
    senderRole: row.senderRole,
    senderName:
      row.senderRole === "PARENT" ? displayName(row.chatRoom.parent) : displayName(row.chatRoom.teacher),
    courseTitle: row.chatRoom.course.courseTitle,
    chatRoomId: row.chatRoomId,
    createdAt: row.createdAt,
    reviewedAt: row.reviewedAt,
  }));

  return { flags, openFlagCount: openCount };
}

/** Admin marks a flag as looked at. Idempotent. */
export async function markChatSafetyFlagReviewed(flagId: string, adminSub: string) {
  const flag = await prisma.chatSafetyFlag.findUnique({
    where: { id: flagId },
    select: { id: true },
  });

  if (!flag) {
    throw new ChatError("Flag not found.", 404);
  }

  await prisma.chatSafetyFlag.updateMany({
    where: { id: flagId, status: ChatReportStatus.OPEN },
    data: { status: ChatReportStatus.REVIEWED, reviewedAt: new Date(), reviewedBySub: adminSub },
  });
}
