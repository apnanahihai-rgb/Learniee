import { prisma } from "@/lib/prisma";
import {
  upsertSingleTeacherFile,
  type TeacherFileInput,
} from "@/features/teacher/server/teacherFile.service";

export interface Step3Input {
  teacherId: string;
  panCardNumber?: string;
  dobProof?: TeacherFileInput;
  addressProof?: TeacherFileInput;
  qualificationProof?: TeacherFileInput;
}

export class Step3AuthorizationError extends Error {}
export class Step3NotFoundError extends Error {}

/**
 * Finds the Teacher for the authenticated Cognito user and confirms
 * the teacherId the client sent actually belongs to them.
 */
export async function assertOwnsTeacher(cognitoSub: string, teacherId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { cognitoId: cognitoSub },
  });

  if (!teacher) {
    throw new Step3NotFoundError("Teacher not found.");
  }

  if (teacher.id !== teacherId) {
    throw new Step3AuthorizationError(
      "You are not authorized to update this teacher.",
    );
  }

  return teacher;
}

/**
 * Saves the PAN number, marks onboarding complete, and saves any of
 * the three Step 3 documents that were uploaded.
 */
export async function saveStep3FormData(input: Step3Input) {
  const updatedTeacher = await prisma.teacher.update({
    where: { id: input.teacherId },
    data: {
      panCardNumber: input.panCardNumber?.trim() || null,
      currentStep: 3,
      onboardingStatus: "COMPLETED",
    },
  });

  if (input.dobProof) {
    await upsertSingleTeacherFile(
      input.teacherId,
      "DOB_PROOF",
      input.dobProof,
    );
  }

  if (input.addressProof) {
    await upsertSingleTeacherFile(
      input.teacherId,
      "ADDRESS_PROOF",
      input.addressProof,
    );
  }

  if (input.qualificationProof) {
    await upsertSingleTeacherFile(
      input.teacherId,
      "QUALIFICATION_PROOF",
      input.qualificationProof,
    );
  }

  return updatedTeacher;
}
