import { NextResponse } from "next/server";

import { requireNotificationRecipient } from "@/features/shared/server/notificationAuth";
import { listNotificationsForRecipient } from "@/features/shared/server/notification.service";

/**
 * GET
 *
 * Newest-first notification feed (default 30) plus the current
 * unread count, for whichever role the logged-in Cognito user
 * resolves to (Parent/Teacher/Admin). One shared route for all
 * three roles — see notificationAuth.ts for why.
 */
export async function GET(req: Request) {
  try {
    const recipient = await requireNotificationRecipient(req);

    if ("error" in recipient) {
      return recipient.error;
    }

    const { items, unreadCount } = await listNotificationsForRecipient(
      recipient.recipientId,
      recipient.recipientRole,
    );

    return NextResponse.json({ success: true, notifications: items, unreadCount });
  } catch (error) {
    console.error("Notifications GET error:", error);

    return NextResponse.json(
      { error: "Failed to fetch notifications." },
      { status: 500 },
    );
  }
}
