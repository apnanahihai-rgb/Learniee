import { NextResponse } from "next/server";

import { requireNotificationRecipient } from "@/features/shared/server/notificationAuth";
import { markNotificationRead } from "@/features/shared/server/notification.service";

/**
 * PATCH /api/notifications/[id]/read
 *
 * Marks one notification read. Scoped to the logged-in recipient —
 * `markNotificationRead` only updates a row that matches both the
 * id AND the caller's recipientId/role, so one user can never mark
 * another's notification read.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Notification id is required." }, { status: 400 });
    }

    const recipient = await requireNotificationRecipient(req);

    if ("error" in recipient) {
      return recipient.error;
    }

    const updated = await markNotificationRead(
      id,
      recipient.recipientId,
      recipient.recipientRole,
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Notification not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notification mark-read error:", error);

    return NextResponse.json(
      { error: "Failed to mark notification as read." },
      { status: 500 },
    );
  }
}
