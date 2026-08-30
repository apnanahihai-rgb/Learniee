import { uploadFileToS3 } from "@/lib/uploadFileToS3";
import type { TeacherFileInput } from "@/features/teacher/server/teacherFile.service";

/**
 * Uploads a single file to S3 (teacher-documents folder) and returns
 * the metadata shape every onboarding-step API expects.
 *
 * Previously this "upload then build {s3Key, originalFileName,
 * mimeType, fileSize}" block was copy-pasted 4 times: profile photo
 * and intro video in useTeacherStep1Form.ts, and certification/award
 * loops in useTeacherStep2Form.ts.
 */
export async function uploadTeacherFile(
  file: File,
  teacherId: string,
): Promise<TeacherFileInput> {
  const s3Key = await uploadFileToS3({
    file,
    folder: "teacher-documents",
    teacherId,
  });

  return {
    s3Key,
    originalFileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  };
}

/** Uploads multiple files sequentially, in order. */
export async function uploadTeacherFiles(
  files: File[],
  teacherId: string,
): Promise<TeacherFileInput[]> {
  const results: TeacherFileInput[] = [];

  for (const file of files) {
    results.push(await uploadTeacherFile(file, teacherId));
  }

  return results;
}
