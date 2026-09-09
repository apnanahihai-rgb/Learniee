import { NextResponse } from "next/server";

import { requireNotificationRecipient } from "@/features/shared/server/notificationAuth";
import { markAllNotificationsRead } from "@/features/shared/server/notification.service";

/**
 * PATCH /api/notifications/mark-all-read
 *
 * Marks every unread notification for the logged-in recipient read.
 */
export async function PATCH(req: Request) {
  try {
    const recipient = await requireNotificationRecipient(req);

    if ("error" in recipient) {
      return recipient.error;
    }

    await markAllNotificationsRead(recipient.recipientId, recipient.recipientRole);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications mark-all-read error:", error);

    return NextResponse.json(
      { error: "Failed to mark notifications as read." },
      { status: 500 },
    );
  }
}
