import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCognitoAuth } from "@/lib/api-auth";

/**
 * Parent-facing account settings for the new `/parent/settings` page.
 * Currently just the in-app notification master toggle
 * (`ParentProfile.notificationsEnabled`) — kept as its own endpoint
 * rather than folded into `/api/parent/profile` since Settings and
 * the contact-card Profile are two different pages with two different
 * jobs. See notification.service.ts for where this flag is enforced.
 *
 * Password changes don't go through this route — they're handled
 * client-side directly against Cognito (see
 * `ChangePasswordCard.tsx`), same pattern as login/forgot-password.
 */
export async function GET(req: Request) {
  try {
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const parent = await prisma.parentProfile.findUnique({
      where: { cognitoSub: auth.payload.sub },
      select: { notificationsEnabled: true },
    });

    if (!parent) {
      return NextResponse.json(
        { error: "Parent profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ settings: parent });
  } catch (error) {
    console.error("Parent settings error:", error);

    return NextResponse.json(
      { error: "Failed to fetch your settings" },
      { status: 500 },
    );
  }
}

interface SettingsUpdateBody {
  notificationsEnabled?: unknown;
}

export async function PATCH(req: Request) {
  try {
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const body = (await req.json()) as SettingsUpdateBody;

    if (typeof body.notificationsEnabled !== "boolean") {
      return NextResponse.json(
        { error: "notificationsEnabled must be true or false." },
        { status: 400 },
      );
    }

    const parent = await prisma.parentProfile.update({
      where: { cognitoSub: auth.payload.sub },
      data: { notificationsEnabled: body.notificationsEnabled },
      select: { notificationsEnabled: true },
    });

    return NextResponse.json({ settings: parent });
  } catch (error) {
    console.error("Parent settings update error:", error);

    return NextResponse.json(
      { error: "Failed to update your settings." },
      { status: 500 },
    );
  }
}
