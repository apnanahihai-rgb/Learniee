"use client";

export type UploadFolder = "teacher-documents" | "child-photos";

interface UploadOptions {
  file: File;
  folder: UploadFolder;
  /** Required when folder is "teacher-documents" */
  teacherId?: string;
}

/**
 * Uploads a file straight to S3 using a short-lived presigned URL:
 * 1. Ask our API for a presigned PUT URL + the object key it picked.
 * 2. PUT the raw file bytes to that URL (goes directly to S3, not
 *    through our server).
 * Returns the S3 object key to store against the record in our DB.
 */
export async function uploadFileToS3({
  file,
  folder,
  teacherId,
}: UploadOptions): Promise<string> {
  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folder,
      fileName: file.name,
      contentType: file.type,
      teacherId,
    }),
  });

  if (!presignRes.ok) {
    const data = await presignRes.json().catch(() => ({}));
    throw new Error(data.error || "Could not prepare file upload");
  }

  const { uploadUrl, key } = await presignRes.json();

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(`Failed to upload ${file.name}`);
  }

  return key as string;
}
