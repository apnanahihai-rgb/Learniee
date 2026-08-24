import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  sub: string;
  email?: string;
  ["custom:role"]?: string;
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get("cookie")?.match(/idToken=([^;]+)/)?.[1];

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwtDecode<TokenPayload>(token);

    /*
     * Development-level role check.
     *
     * IMPORTANT:
     * Decode-only JWT checks are not production-safe.
     * Later we should verify the Cognito JWT signature.
     */
    if (decoded["custom:role"] !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const teachers = await prisma.teacher.findMany({
      where: {
        approvalStatus: "PENDING",
      },
      include: {
        professionalInfo: true,
        documents: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      teachers,
    });
  } catch (error) {
    console.error("Admin teachers error:", error);

    return NextResponse.json(
      { error: "Failed to fetch teachers" },
      { status: 500 },
    );
  }
}
