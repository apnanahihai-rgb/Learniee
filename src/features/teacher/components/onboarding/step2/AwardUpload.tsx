"use client";

import MultiFileUploadField, {
  type UploadedFileMeta,
} from "@/features/shared/components/MultiFileUploadField";

interface AwardUploadProps {
  files: File[];
  existingFiles: UploadedFileMeta[];
  onChange: (files: File[]) => void;
  error?: string;
}

/**
 * Thin wrapper around the shared MultiFileUploadField.
 * See MultiFileUploadField.tsx for the actual upload/preview logic —
 * this used to duplicate ~220 lines with CertificationUpload.tsx.
 */
export default function AwardUpload(props: AwardUploadProps) {
  return (
    <MultiFileUploadField
      id="awards"
      label="Awards"
      uploadHint="Click to upload awards"
      {...props}
    />
  );
}
