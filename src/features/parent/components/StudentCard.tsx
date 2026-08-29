"use client";

import Link from "next/link";
import { GraduationCap, ChevronRight } from "lucide-react";

import type { StudentProfile } from "@/features/parent/types/student";

interface Props {
  student: StudentProfile;
}

// A handful of gradients so children without a photo aren't all
// the same flat gray tile - which one a child gets is deterministic
// (hashed from their id), not random on every render.
const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-blue-500",
];

function gradientFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

/**
 * "Child" tile used in the dashboard's "Your Children" grid.
 * The whole tile links through to that child's profile hub
 * (/parent/students/[studentId]) - full details, enrollment status
 * (once built), and the option to remove the profile all live
 * there, not on this card.
 */
export default function StudentCard({ student }: Props) {
  const displayName =
    student.visibleName || `${student.firstName} ${student.lastName}`;
  const subtitle = [student.standard, student.board].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/parent/students/${student.id}`}
      className="group bg-white border rounded-2xl shadow-sm overflow-hidden hover:shadow-lg hover:border-violet-300 hover:-translate-y-0.5 transition-all duration-200"
    >
      <div
        className={`relative h-32 flex items-center justify-center overflow-hidden ${
          student.photoViewUrl
            ? "bg-gray-100"
            : `bg-gradient-to-br ${gradientFor(student.id)}`
        }`}
      >
        {student.photoViewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={student.photoViewUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-4xl font-bold text-white/90">
            {student.firstName.charAt(0).toUpperCase()}
          </span>
        )}

        {student.age != null && (
          <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-[11px] font-semibold text-gray-700 px-2 py-0.5 rounded-full shadow-sm">
            Age {student.age}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-800 truncate">{displayName}</h3>

        <p className="flex items-center gap-1 text-xs text-gray-500 mt-1 truncate min-h-[1rem]">
          {subtitle ? (
            <>
              <GraduationCap size={13} className="text-gray-400 flex-shrink-0" />
              {subtitle}
            </>
          ) : (
            "Tap to complete profile"
          )}
        </p>

        <p className="flex items-center gap-0.5 text-xs font-medium text-violet-600 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          View profile <ChevronRight size={13} />
        </p>
      </div>
    </Link>
  );
}
