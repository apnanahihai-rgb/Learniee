"use client";

import Link from "next/link";

import type { StudentProfile } from "@/features/parent/types/student";

interface Props {
  student: StudentProfile;
}

/**
 * Compact "child" tile used in the dashboard's "Your Children"
 * grid. The whole tile links through to that child's profile hub
 * (/parent/students/[studentId]) - full details, enrollment status
 * (once built), and the option to remove the profile all live
 * there, not on this card.
 */
export default function StudentCard({ student }: Props) {
  const displayName =
    student.visibleName || `${student.firstName} ${student.lastName}`;

  return (
    <Link
      href={`/parent/students/${student.id}`}
      className="group bg-white border rounded-xl shadow-sm overflow-hidden hover:shadow-md hover:border-violet-300 transition-all"
    >
      <div className="h-28 bg-gray-100 flex items-center justify-center overflow-hidden">
        {student.photoViewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={student.photoViewUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-3xl font-semibold text-gray-300">
            {student.firstName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-800 truncate">
          {displayName}
        </h3>
        <p className="text-xs text-gray-500 mt-1 truncate">
          {[student.standard, student.board].filter(Boolean).join(" · ") ||
            "Tap to view profile"}
        </p>
        <p className="text-xs text-violet-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          View profile →
        </p>
      </div>
    </Link>
  );
}