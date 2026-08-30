"use client";

import MultiFileUploadField, {
  type UploadedFileMeta,
} from "@/features/shared/components/MultiFileUploadField";

interface CertificationUploadProps {
  files: File[];
  existingFiles: UploadedFileMeta[];
  onChange: (files: File[]) => void;
  error?: string;
}

/**
 * Thin wrapper around the shared MultiFileUploadField.
 * See MultiFileUploadField.tsx for the actual upload/preview logic —
 * this used to duplicate ~220 lines with AwardUpload.tsx.
 */
export default function CertificationUpload(props: CertificationUploadProps) {
  return (
    <MultiFileUploadField
      id="certifications"
      label="Certifications"
      uploadHint="Click to upload certifications"
      {...props}
    />
  );
}
