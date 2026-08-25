import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCognitoAuth } from "@/lib/api-auth";

export async function GET(req: Request) {
  try {
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    const teacher = await prisma.teacher.findUnique({
      where: {
        cognitoId: auth.payload.sub,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        visibleName: true,
        email: true,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      teacher,
    });

  } catch (error) {
    console.error(
      "Teacher profile error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to fetch teacher profile" },
      { status: 500 }
    );
  }
}