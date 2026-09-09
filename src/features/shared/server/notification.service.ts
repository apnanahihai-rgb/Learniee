import "server-only";

import { prisma } from "@/lib/prisma";
import { NotificationRecipientRole, NotificationType } from "@prisma/client";

/**
 * In-app notifications (added Sep 8, 2026) — MVP-minimal version of
 * what 06-OPEN-DECISIONS.md #32 originally decided for Phase 2
 * (bucketed categories, global + per-user toggles). This is
 * deliberately simpler: one flat feed per recipient, no categories,
 * no subscribe/unsubscribe. Treat #32's fuller version as still
 * open — this only covers "does the recipient get told when X
 * happens," not the toggle/preferences layer.
 *
 * `recipientId` + `recipientRole` is a loosely-typed pointer (see
 * the `Notification` model's doc-comment in schema.prisma) — the
 * same established pattern as `ChatMessage.senderId`. Every trigger
 * function elsewhere in the app (notificationTriggers.service.ts)
 * should call through this file rather than writing to
 * `prisma.notification` directly, so list/read semantics stay in
 * one place.
 */

export interface CreateNotificationInput {
  recipientId: string;
  recipientRole: NotificationRecipientRole;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
}

/**
 * Writes one notification. Callers that invoke this from inside
 * another feature's business logic (enrollment approval, chat, etc.)
 * should always wrap the call in try/catch — a notification-write
 * failure must never block or roll back the primary action it's
 * attached to. This mirrors the existing convention already used for
 * `processReferralRewardForNewEnrollment()` in referral.service.ts.
 */
export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      recipientId: input.recipientId,
      recipientRole: input.recipientRole,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
    },
  });
}

/** Batched version for fan-out (e.g. notifying every Admin, or every interested Parent). */
export async function createNotifications(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) {
    return;
  }

  await prisma.notification.createMany({
    data: inputs.map((input) => ({
      recipientId: input.recipientId,
      recipientRole: input.recipientRole,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
    })),
  });
}

/**
 * Notifies every Admin row that exists — the Admin action-queue
 * pattern (enrollment approvals, leave requests) is "any Admin can
 * act on it," so every Admin gets the notification rather than
 * picking one. The Admin table is small by design (see
 * 08-PROJECT-KNOWLEDGE-BASE.md), so this is a cheap query.
 */
export async function notifyAllAdmins(
  input: Omit<CreateNotificationInput, "recipientId" | "recipientRole">,
) {
  const admins = await prisma.admin.findMany({ select: { id: true } });

  await createNotifications(
    admins.map((admin) => ({
      ...input,
      recipientId: admin.id,
      recipientRole: NotificationRecipientRole.ADMIN,
    })),
  );
}

const DEFAULT_LIST_LIMIT = 30;

/** Newest-first feed for one recipient, plus their current unread count. */
export async function listNotificationsForRecipient(
  recipientId: string,
  recipientRole: NotificationRecipientRole,
  limit = DEFAULT_LIST_LIMIT,
) {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId, recipientRole },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({
      where: { recipientId, recipientRole, isRead: false },
    }),
  ]);

  return { items, unreadCount };
}

/** Marks one notification read — scoped to the recipient so one user can never mark another's. */
export async function markNotificationRead(
  notificationId: string,
  recipientId: string,
  recipientRole: NotificationRecipientRole,
) {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, recipientId, recipientRole },
    data: { isRead: true, readAt: new Date() },
  });

  return result.count > 0;
}

/** Marks every unread notification for this recipient read (the "mark all read" action). */
export async function markAllNotificationsRead(
  recipientId: string,
  recipientRole: NotificationRecipientRole,
) {
  await prisma.notification.updateMany({
    where: { recipientId, recipientRole, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}
