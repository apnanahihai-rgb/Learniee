import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  sub: string;
}

export async function GET(req: Request) {
  try {
    const token = req.headers
      .get("cookie")
      ?.match(/idToken=([^;]+)/)?.[1];

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded = jwtDecode<TokenPayload>(token);

    if (!decoded.sub) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const teacher = await prisma.teacher.findUnique({
      where: {
        cognitoId: decoded.sub,
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