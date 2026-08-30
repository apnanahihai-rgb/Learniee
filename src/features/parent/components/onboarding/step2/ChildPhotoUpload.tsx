"use client";

import { ImagePlus, X } from "lucide-react";

export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "application/pdf"];
export const MAX_FILE_SIZE_MB = 50;

interface ChildPhotoUploadProps {
  photo: File | null;
  error: string;
  onSelect: (file: File | null) => void;
}

export default function ChildPhotoUpload({
  photo,
  error,
  onSelect,
}: ChildPhotoUploadProps) {
  return (
    <div className="sm:col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Child&apos;s Photo
        <span className="text-gray-400 font-normal ml-1">(optional)</span>
      </label>

      {photo ? (
        <div className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg px-4 py-3 bg-violet-50/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center size-9 rounded-full bg-violet-100 text-violet-600 shrink-0">
              <ImagePlus className="size-4" />
            </div>
            <p className="text-sm font-medium text-gray-800 truncate">
              {photo.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="flex items-center justify-center size-7 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 shrink-0"
            aria-label="Remove photo"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor="child-photo"
          className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 rounded-lg py-6 px-4 text-gray-500 cursor-pointer hover:border-violet-300 hover:bg-violet-50/40 transition-colors"
        >
          <ImagePlus className="size-5 text-gray-400" />
          <input
            id="child-photo"
            type="file"
            accept=".png,.jpg,.jpeg,.pdf"
            className="hidden"
            onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
          />
          <p className="text-sm font-medium">Click to upload a photo</p>
          <p className="text-xs text-gray-400">
            PNG, JPG or PDF, up to {MAX_FILE_SIZE_MB}MB
          </p>
        </label>
      )}

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
