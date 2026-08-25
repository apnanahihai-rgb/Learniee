import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCognitoAuth } from "@/lib/api-auth";

export async function GET(req: Request) {
  try {
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    // Find teacher using Cognito ID
    const teacher = await prisma.teacher.findUnique({
      where: {
        cognitoId: auth.payload.sub,
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