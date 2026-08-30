import Link from "next/link";
import { GraduationCap, School, ChevronRight } from "lucide-react";

import ChildAvatar from "@/features/parent/components/ChildAvatar";
import type { StudentProfile } from "@/features/parent/types/student";

interface Props {
  student: StudentProfile;
}

/**
 * Replaces the "Your Children" grid on the dashboard once a
 * specific learner is selected in LearnerSwitcher - a bigger,
 * single-child summary instead of a wall of cards for children
 * that aren't the one you picked.
 */
export default function ChildFocusCard({ student }: Props) {
  const displayName = student.visibleName || `${student.firstName} ${student.lastName}`;
  const details = [
    student.age != null ? `Age ${student.age}` : null,
    student.standard,
    student.board,
  ].filter(Boolean);

  return (
    <div className="bg-white border border-violet-100 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 mb-10 shadow-sm">
      <ChildAvatar src={student.photoViewUrl} name={displayName} size="md" />

      <div className="flex-1 min-w-0">
        <h2 className="font-heading text-lg font-bold text-gray-800">{displayName}</h2>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
          {details.length > 0 ? (
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <GraduationCap size={14} className="text-gray-400" />
              {details.join(" · ")}
            </span>
          ) : (
            <span className="text-sm text-gray-400">Profile details not filled in yet</span>
          )}

          {student.currentSchoolName && (
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <School size={14} className="text-gray-400" />
              {student.currentSchoolName}
            </span>
          )}
        </div>
      </div>

      <Link
        href={`/parent/students/${student.id}`}
        className="inline-flex items-center gap-1 text-sm font-bold text-brand hover:text-brand-dark flex-shrink-0"
      >
        View full profile <ChevronRight size={15} />
      </Link>
    </div>
  );
}
