"use client";

import Link from "next/link";
import { Plus, Users } from "lucide-react";

import ChildAvatar from "@/features/parent/components/ChildAvatar";
import type { StudentProfile } from "@/features/parent/types/student";

export type LearnerFilter = "all" | string;

interface Props {
  students: StudentProfile[];
  active: LearnerFilter;
  onSelect: (id: LearnerFilter) => void;
}

/**
 * Horizontal "which child am I looking at" switcher, styled after
 * Outschool's learner tabs (All | [avatar] Name | + Add a learner).
 * Purely a view filter - it doesn't change which courses exist,
 * just how the rest of the dashboard is scoped/labelled. See the
 * note rendered on the dashboard when a specific child is active:
 * course-to-child linking depends on Enrollment, which isn't built
 * yet (03-DATA-MODEL.md), so this can't filter *which* courses show,
 * only who the page is currently "for".
 */
export default function LearnerSwitcher({ students, active, onSelect }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-8 -mx-1 px-1">
      <Tab
        active={active === "all"}
        icon={<Users size={16} />}
        label="All"
        onClick={() => onSelect("all")}
      />

      {students.map((student) => {
        const name = student.visibleName || student.firstName;
        const subtitle = [student.standard, student.board].filter(Boolean).join(" · ");

        return (
          <Tab
            key={student.id}
            active={active === student.id}
            avatar={<ChildAvatar src={student.photoViewUrl} name={name} size="xs" />}
            label={name}
            subtitle={subtitle}
            onClick={() => onSelect(student.id)}
          />
        );
      })}

      <Link
        href="/parent/students/new"
        className="flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full border-2 border-dashed border-violet-200 text-violet-400 hover:text-brand hover:border-brand-light transition-colors flex-shrink-0"
      >
        <span className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center flex-shrink-0">
          <Plus size={16} />
        </span>
        <span className="text-sm font-bold whitespace-nowrap">Add a learner</span>
      </Link>
    </div>
  );
}

function Tab({
  active,
  icon,
  avatar,
  label,
  subtitle,
  onClick,
}: {
  active: boolean;
  icon?: React.ReactNode;
  avatar?: React.ReactNode;
  label: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full border-2 transition-all flex-shrink-0 ${
        active
          ? "bg-brand border-brand text-white shadow-playful"
          : "bg-white border-violet-100 text-gray-700 hover:border-brand-light"
      }`}
    >
      {avatar ?? (
        <span
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            active ? "bg-white/20" : "bg-violet-50 text-brand"
          }`}
        >
          {icon}
        </span>
      )}

      <span className="text-left leading-tight">
        <span className="block text-sm font-bold whitespace-nowrap">{label}</span>
        {subtitle && (
          <span className={`block text-[11px] font-normal whitespace-nowrap ${active ? "text-white/80" : "text-gray-400"}`}>
            {subtitle}
          </span>
        )}
      </span>
    </button>
  );
}
