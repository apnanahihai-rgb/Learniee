import { prisma } from "@/lib/prisma";
import type { TeacherFileType } from "@prisma/client";

/**
 * Shared TeacherFile persistence helpers.
 *
 * Previously the "find existing file of this type, update it, else
 * create it" pattern was copy-pasted independently in:
 *   - step1.service.ts (PROFILE_PHOTO, INTRO_VIDEO)
 *   - step3/route.ts   (DOB_PROOF, ADDRESS_PROOF, QUALIFICATION_PROOF)
 * and the "create many files of this type" pattern was copy-pasted
 * twice in step2.service.ts (CERTIFICATION, AWARD).
 * Consolidated here so future file types don't repeat it a 4th time.
 */

export interface TeacherFileInput {
  s3Key: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}

/**
 * Single-file-per-type slots (e.g. profile photo, intro video, DOB proof).
 * Finds the most recent existing file of this type and updates it in
 * place, or creates a new one. Deliberately does NOT create duplicates
 * on repeated saves (e.g. a teacher pressing "Next" multiple times).
 */
export async function upsertSingleTeacherFile(
  teacherId: string,
  type: TeacherFileType,
  file: TeacherFileInput,
) {
  const existing = await prisma.teacherFile.findFirst({
    where: { teacherId, type },
    orderBy: { createdAt: "desc" },
  });

  const data = {
    s3Key: file.s3Key,
    originalFileName: file.originalFileName,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
  };

  if (existing) {
    return prisma.teacherFile.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.teacherFile.create({
    data: { teacherId, type, ...data },
  });
}

/**
 * Multi-file-per-type slots (e.g. certifications, awards) where every
 * upload adds a new row rather than replacing a single slot. No-ops on
 * an empty/undefined list.
 */
export async function createTeacherFiles(
  teacherId: string,
  type: TeacherFileType,
  files: TeacherFileInput[] | undefined,
) {
  if (!files || files.length === 0) {
    return;
  }

  await prisma.teacherFile.createMany({
    data: files.map((file) => ({
      teacherId,
      type,
      s3Key: file.s3Key,
      originalFileName: file.originalFileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
    })),
  });
}
