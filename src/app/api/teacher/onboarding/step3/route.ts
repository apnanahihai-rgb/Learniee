import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const {
      teacherId,
      panCardNumber,
      dobProofKey,
      addressProofKey,
      qualificationProofKey,
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

    // Files are uploaded to S3 directly from the browser via a
    // presigned URL (see /api/upload/presign) before this route is
    // called, so we only ever receive the resulting object keys
    // here - never raw file bytes.
    const hasAnyDocumentKey =
      dobProofKey || addressProofKey || qualificationProofKey;

    if (hasAnyDocumentKey) {
      await prisma.teacherDocuments.upsert({
        where: { teacherId },
        update: {
          ...(dobProofKey && { dobProofKey }),
          ...(addressProofKey && { addressProofKey }),
          ...(qualificationProofKey && { qualificationProofKey }),
          ...(panCardNumber && { panCardNumber: panCardNumber.trim() }),
        },
        create: {
          id: randomUUID(),
          teacherId,
          dobProofKey: dobProofKey || null,
          addressProofKey: addressProofKey || null,
          qualificationProofKey: qualificationProofKey || null,
          panCardNumber: panCardNumber?.trim() || null,
        },
      });
    }

    // Save PAN and complete onboarding.
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
