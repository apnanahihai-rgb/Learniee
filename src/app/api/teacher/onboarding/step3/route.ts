import { NextResponse } from "next/server";
import { requireCognitoAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

interface Step3FileInput {
  s3Key: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}

interface Step3Input {
  teacherId: string;
  panCardNumber?: string;

  dobProof?: Step3FileInput;
  addressProof?: Step3FileInput;
  qualificationProof?: Step3FileInput;
}

async function saveTeacherFile(
  teacherId: string,
  type:
    | "DOB_PROOF"
    | "ADDRESS_PROOF"
    | "QUALIFICATION_PROOF",
  file: Step3FileInput,
) {
  const existingFile =
    await prisma.teacherFile.findFirst({
      where: {
        teacherId,
        type,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  if (existingFile) {
    return prisma.teacherFile.update({
      where: {
        id: existingFile.id,
      },
      data: {
        s3Key: file.s3Key,
        originalFileName: file.originalFileName,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
      },
    });
  }

  return prisma.teacherFile.create({
    data: {
      teacherId,
      type,
      s3Key: file.s3Key,
      originalFileName: file.originalFileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
    },
  });
}

export async function POST(req: Request) {
  try {
    /*
     * ------------------------------------------------------
     * 1. Authenticate using Cognito
     * ------------------------------------------------------
     */
    const auth = requireCognitoAuth(req);

    if ("error" in auth) {
      return auth.error;
    }

    /*
     * ------------------------------------------------------
     * 2. Read request body
     * ------------------------------------------------------
     */
    const data: Step3Input = await req.json();

    const {
      teacherId,
      panCardNumber,
      dobProof,
      addressProof,
      qualificationProof,
    } = data;

    if (!teacherId) {
      return NextResponse.json(
        {
          error: "Teacher ID missing.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * ------------------------------------------------------
     * 3. Find teacher belonging to logged-in Cognito user
     * ------------------------------------------------------
     */
    const teacher =
      await prisma.teacher.findUnique({
        where: {
          cognitoId: auth.payload.sub,
        },
      });

    if (!teacher) {
      return NextResponse.json(
        {
          error: "Teacher not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * ------------------------------------------------------
     * 4. Security check
     *
     * The teacherId sent by the browser must belong to
     * the authenticated Cognito user.
     * ------------------------------------------------------
     */
    if (teacher.id !== teacherId) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to update this teacher.",
        },
        {
          status: 403,
        },
      );
    }

    /*
     * ------------------------------------------------------
     * 5. Save PAN number
     * ------------------------------------------------------
     */
    const updatedTeacher =
      await prisma.teacher.update({
        where: {
          id: teacher.id,
        },
        data: {
          panCardNumber:
            panCardNumber?.trim() || null,

          currentStep: 3,

          onboardingStatus: "COMPLETED",
        },
      });

    /*
     * ------------------------------------------------------
     * 6. Save DOB proof
     * ------------------------------------------------------
     */
    if (dobProof) {
      await saveTeacherFile(
        teacher.id,
        "DOB_PROOF",
        dobProof,
      );
    }

    /*
     * ------------------------------------------------------
     * 7. Save Address proof
     * ------------------------------------------------------
     */
    if (addressProof) {
      await saveTeacherFile(
        teacher.id,
        "ADDRESS_PROOF",
        addressProof,
      );
    }

    /*
     * ------------------------------------------------------
     * 8. Save Qualification proof
     * ------------------------------------------------------
     */
    if (qualificationProof) {
      await saveTeacherFile(
        teacher.id,
        "QUALIFICATION_PROOF",
        qualificationProof,
      );
    }

    /*
     * ------------------------------------------------------
     * 9. Return result
     * ------------------------------------------------------
     */
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
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to complete teacher onboarding.",
      },
      {
        status: 500,
      },
    );
  }
}