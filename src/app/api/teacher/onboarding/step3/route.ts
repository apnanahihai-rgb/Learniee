import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const {
      teacherId,
      panCardNumber,
    } = data;

    if (!teacherId) {
      return NextResponse.json(
        {
          error: "Teacher ID missing",
        },
        {
          status: 400,
        }
      );
    }

    // Check that Teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: {
        id: teacherId,
      },
    });

    if (!teacher) {
      return NextResponse.json(
        {
          error: "Teacher not found",
        },
        {
          status: 404,
        }
      );
    }

    // Save PAN and complete onboarding.
    // File uploads are intentionally NOT handled yet.
    const updatedTeacher = await prisma.teacher.update({
      where: {
        id: teacherId,
      },

      data: {
        panCardNumber:
          panCardNumber?.trim() || null,

        currentStep: 3,

        onboardingStatus: "COMPLETED",

        // Admin approval is still required.
        // approvalStatus remains PENDING.
      },
    });

    return NextResponse.json({
      success: true,

      message:
        "Teacher onboarding completed successfully.",

      teacherId: updatedTeacher.id,

      currentStep:
        updatedTeacher.currentStep,

      onboardingStatus:
        updatedTeacher.onboardingStatus,

      approvalStatus:
        updatedTeacher.approvalStatus,
    });

  } catch (error) {
    console.error(
      "Teacher Step 3 Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to complete teacher onboarding.",
      },
      {
        status: 500,
      }
    );
  }
}