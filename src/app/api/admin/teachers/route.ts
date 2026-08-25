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
    // -----------------------------------------
    // Get Cognito ID token
    // -----------------------------------------
    const token = req.headers
      .get("cookie")
      ?.match(/idToken=([^;]+)/)?.[1];

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // -----------------------------------------
    // Decode token
    // -----------------------------------------
    const decoded = jwtDecode<TokenPayload>(token);

    // -----------------------------------------
    // Check admin role
    // -----------------------------------------
    if (decoded["custom:role"] !== "admin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // -----------------------------------------
    // Get pending teachers
    // -----------------------------------------
    const teachers = await prisma.teacher.findMany({
      where: {
        approvalStatus: "PENDING",

        // Only show teachers who have
        // completed onboarding
        onboardingStatus: "COMPLETED",
      },

      include: {
        professionalInfo: true,

        // S3 files will be available here
        // once S3 integration is implemented.
        files: true,
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
    console.error(
      "Admin teachers error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to fetch teachers",
      },
      {
        status: 500,
      }
    );
  }
}