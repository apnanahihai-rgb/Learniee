import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  sub: string;
}

export async function GET(req: Request) {
  try {
    // Get Cognito ID token from cookie
    const token = req.headers
      .get("cookie")
      ?.match(/idToken=([^;]+)/)?.[1];

    if (!token) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    // Decode Cognito token
    const decoded = jwtDecode<TokenPayload>(token);

    if (!decoded.sub) {
      return NextResponse.json(
        {
          error: "Invalid Cognito token",
        },
        {
          status: 401,
        }
      );
    }

    // Find teacher using Cognito ID
    const teacher = await prisma.teacher.findUnique({
      where: {
        cognitoId: decoded.sub,
      },
      select: {
        id: true,
        currentStep: true,
        onboardingStatus: true,
        approvalStatus: true,
      },
    });

    // Teacher has not created an RDS record yet
    if (!teacher) {
      return NextResponse.json({
        onboardingComplete: false,
        currentStep: 0,
        onboardingStatus: "NOT_STARTED",
        approvalStatus: null,
      });
    }

    return NextResponse.json({
      // We calculate this instead of storing another column
      onboardingComplete:
        teacher.onboardingStatus === "COMPLETED",

      currentStep: teacher.currentStep,

      onboardingStatus:
        teacher.onboardingStatus,

      approvalStatus:
        teacher.approvalStatus,
    });

  } catch (error) {
    console.error(
      "Teacher onboarding status error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to check teacher onboarding status",
      },
      {
        status: 500,
      }
    );
  }
}