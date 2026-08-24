import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const {
      teacherId,
      panCardNumber,
      ...documentKeys
    } = data;

    // Validate teacher ID
    if (!teacherId) {
      return NextResponse.json(
        {
          error: "Teacher ID missing",
        },
        { status: 400 }
      );
    }

    // Check that teacher exists
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
        { status: 404 }
      );
    }

    // Save / update Step 3 document information
    const documents = await prisma.teacherDocuments.upsert({
      where: {
        teacherId: teacherId,
      },

      update: {
        panCardNumber: panCardNumber || null,
        ...documentKeys,
      },

      create: {
        teacherId: teacherId,
        panCardNumber: panCardNumber || null,
        ...documentKeys,
      },
    });

    // Step 3 is completed
    // Therefore the complete onboarding process is finished.
    await prisma.teacher.update({
      where: {
        id: teacherId,
      },

      data: {
        onboardingComplete: true,

        // Teacher still needs admin approval.
        // We intentionally DO NOT change approvalStatus here.
        // It remains PENDING.
      },
    });

    return NextResponse.json({
      success: true,
      message: "Teacher onboarding completed successfully.",
      teacherId: teacherId,
      onboardingComplete: true,
      approvalStatus: teacher.approvalStatus,
      documents,
    });

  } catch (error) {
    console.error(
      "Teacher Step 3 Error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to complete teacher onboarding.",
      },
      {
        status: 500,
      }
    );
  }
}