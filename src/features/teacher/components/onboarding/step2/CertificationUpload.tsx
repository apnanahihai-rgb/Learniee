"use client";

import { useEffect, useState } from "react";

interface CertificationFile {
  id: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}

interface CertificationUploadProps {
  files: File[];
  existingFiles: CertificationFile[];
  onChange: (files: File[]) => void;
  error?: string;
}

interface PreviewFile {
  file: File;
  url: string;
}

export default function CertificationUpload({
  files,
  existingFiles,
  onChange,
  error,
}: CertificationUploadProps) {
  const [previews, setPreviews] = useState<PreviewFile[]>([]);

  /*
   * Create browser preview URLs whenever selected files change.
   */
  useEffect(() => {
    const previewFiles = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setPreviews(previewFiles);

    /*
     * Cleanup object URLs when files change
     * or component unmounts.
     */
    return () => {
      previewFiles.forEach((preview) => {
        URL.revokeObjectURL(preview.url);
      });
    };
  }, [files]);

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFiles = Array.from(
      e.target.files ?? [],
    );

    /*
     * Validate files before adding them.
     */
    const validFiles = selectedFiles.filter((file) => {
      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "application/pdf",
      ];

      const validType = allowedTypes.includes(
        file.type,
      );

      const validSize =
        file.size <= 50 * 1024 * 1024;

      return validType && validSize;
    });

    onChange([
      ...files,
      ...validFiles,
    ]);

    // Allows selecting the same file again.
    e.target.value = "";
  }

  function removeFile(index: number) {
    onChange(
      files.filter(
        (_, fileIndex) =>
          fileIndex !== index,
      ),
    );
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-800 mb-2">
        Certifications
      </label>

      {/* Upload box */}
      <label
        htmlFor="certifications"
        className="border-2 border-dashed rounded-md p-5 text-sm text-gray-500 bg-gray-50 cursor-pointer block hover:bg-gray-100"
      >
        <input
          id="certifications"
          type="file"
          multiple
          accept="image/png,image/jpeg,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        <p className="text-center">
          Click to upload certifications
        </p>

        <p className="text-xs text-center mt-2">
          PDF, PNG, JPG | Max 50MB per file
        </p>
      </label>

      {/* Selected files */}
      {previews.length > 0 && (
        <div className="mt-4 space-y-4">
          {previews.map(
            ({ file, url }, index) => (
              <div
                key={`${file.name}-${index}`}
                className="border rounded-md p-3 bg-white"
              >
                {/* IMAGE PREVIEW */}
                {file.type ===
                  "image/png" ||
                file.type ===
                  "image/jpeg" ? (
                  <div className="mb-3">
                    <img
                      src={url}
                      alt={file.name}
                      className="w-full max-h-64 object-contain rounded-md border bg-gray-50"
                    />
                  </div>
                ) : null}

                {/* PDF PREVIEW */}
                {file.type ===
                  "application/pdf" ? (
                  <div className="mb-3">
                    <iframe
                      src={url}
                      title={file.name}
                      className="w-full h-64 rounded-md border"
                    />
                  </div>
                ) : null}

                {/* File information */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-purple-600 font-medium break-all">
                      {file.name}
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      {(
                        file.size /
                        (1024 * 1024)
                      ).toFixed(2)}{" "}
                      MB
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeFile(index)
                    }
                    className="text-sm text-red-600 hover:text-red-800 shrink-0"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {/* Existing files */}
      {existingFiles.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold text-gray-600 mb-2">
            Previously uploaded
          </p>

          <div className="space-y-2">
            {existingFiles.map((file) => (
              <div
                key={file.id}
                className="border rounded-md p-3 bg-green-50"
              >
                <p className="text-sm text-green-700 font-medium break-all">
                  {file.originalFileName}
                </p>

                <p className="text-xs text-green-600 mt-1">
                  Previously uploaded
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}