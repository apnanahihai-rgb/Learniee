"use client";

import { Camera, FileText, X } from "lucide-react";
import ChildAvatar from "@/features/parent/components/ChildAvatar";
import { MAX_FILE_SIZE_MB } from "@/features/parent/hooks/useStudentForm";

interface StudentPhotoFieldProps {
  firstName: string;
  photo: File | null;
  photoPreviewUrl: string | null;
  photoError: string;
  onPhotoSelect: (file: File | null) => void;
}

export default function StudentPhotoField({
  firstName,
  photo,
  photoPreviewUrl,
  photoError,
  onPhotoSelect,
}: StudentPhotoFieldProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <ChildAvatar src={photoPreviewUrl} name={firstName || "?"} size="lg" />

        <label
          htmlFor="student-photo"
          className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center cursor-pointer hover:bg-violet-700 transition-colors shadow-sm ring-2 ring-white"
          title="Upload a photo"
        >
          <Camera size={15} />
          <input
            id="student-photo"
            type="file"
            accept=".png,.jpg,.jpeg,.pdf"
            className="hidden"
            onChange={(e) => onPhotoSelect(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {photo && !photo.type.startsWith("image/") && (
        <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
          <FileText size={13} />
          <span className="max-w-[12rem] truncate">{photo.name}</span>
          <button
            type="button"
            onClick={() => onPhotoSelect(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-2">
        Max file size: {MAX_FILE_SIZE_MB}MB · PNG, JPG, or PDF
      </p>
      {photoError && <p className="text-red-600 text-xs mt-1">{photoError}</p>}
    </div>
  );
}
