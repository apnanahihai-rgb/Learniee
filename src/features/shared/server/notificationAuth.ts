import { NextResponse } from "next/server";
import { NotificationRecipientRole } from "@prisma/client";

import { requireCognitoAuth, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * Notifications are read by all three MVP roles (Parent/Teacher/
 * Admin) through one shared set of routes
 * (`/api/notifications*`), unlike most other features which have
 * separate per-role route trees. This resolves whichever row the
 * logged-in Cognito user maps to, so those routes don't need three
 * copies of the same auth boilerplate.
 *
 * Same decode-only Cognito auth level as every other Parent/Teacher
 * GET route today (06-OPEN-DECISIONS.md #21) — notifications are
 * read-only and not money-adjacent, so this doesn't need the
 * signature-verified path reserved for payment routes.
 */
export async function requireNotificationRecipient(
  req: Request,
): Promise<
  | { recipientId: string; recipientRole: NotificationRecipientRole }
  | { error: ReturnType<typeof NextResponse.json> }
> {
  const auth = requireCognitoAuth(req);

  if ("error" in auth) {
    return auth;
  }

  const role = auth.payload["custom:role"];

  if (role === "parent") {
    const parent = await prisma.parentProfile.findUnique({
      where: { cognitoSub: auth.payload.sub },
      select: { id: true },
    });

    if (!parent) {
      return { error: unauthorizedResponse("Complete onboarding first.") };
    }

    return { recipientId: parent.id, recipientRole: NotificationRecipientRole.PARENT };
  }

  if (role === "teacher") {
    const teacher = await prisma.teacher.findUnique({
      where: { cognitoId: auth.payload.sub },
      select: { id: true },
    });

    if (!teacher) {
      return { error: unauthorizedResponse("Teacher not found.") };
    }

    return { recipientId: teacher.id, recipientRole: NotificationRecipientRole.TEACHER };
  }

  if (role === "admin") {
    const admin = await prisma.admin.findUnique({
      where: { cognitoId: auth.payload.sub },
      select: { id: true },
    });

    if (!admin) {
      return { error: unauthorizedResponse("Admin not found.") };
    }

    return { recipientId: admin.id, recipientRole: NotificationRecipientRole.ADMIN };
  }

  return { error: NextResponse.json({ error: "Unsupported role for notifications." }, { status: 403 }) };
}
