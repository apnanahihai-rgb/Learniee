import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCognitoAuth } from "@/lib/api-auth";

/**
 * Teacher-facing account settings for the new `/teacher/settings`
 * page. Same shape and reasoning as `/api/parent/settings` — see
 * that route's comment.
 */
export async function GET(req: Request) {
  try {
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const teacher = await prisma.teacher.findUnique({
      where: { cognitoId: auth.payload.sub },
      select: { notificationsEnabled: true },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ settings: teacher });
  } catch (error) {
    console.error("Teacher settings error:", error);

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

    const teacher = await prisma.teacher.update({
      where: { cognitoId: auth.payload.sub },
      data: { notificationsEnabled: body.notificationsEnabled },
      select: { notificationsEnabled: true },
    });

    return NextResponse.json({ settings: teacher });
  } catch (error) {
    console.error("Teacher settings update error:", error);

    return NextResponse.json(
      { error: "Failed to update your settings." },
      { status: 500 },
    );
  }
}
