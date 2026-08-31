"use client";

import Link from "next/link";
import { Plus, Users, GraduationCap } from "lucide-react";

import ChildAvatar from "@/features/parent/components/ChildAvatar";
import type { StudentProfile } from "@/features/parent/types/student";

export type LearnerFilter = "all" | string;

interface Props {
  students: StudentProfile[];
  active: LearnerFilter;
  onSelect: (id: LearnerFilter) => void;
  loading?: boolean;
}

/**
 * The dashboard's single "which child am I looking at" surface —
 * this now *replaces* the old center-of-page "Your Children" grid
 * (StudentCard tiles / ChildFocusCard) entirely, rather than
 * sitting above it. It's the one place on /parent to switch,
 * glance at, or add a child, so it's styled as its own highlighted
 * card directly under the navbar instead of a plain row of pills.
 *
 * Purely a view filter — it doesn't change which courses exist,
 * just how the rest of the dashboard is scoped/labelled. Course-
 * to-child linking depends on Enrollment, which isn't built yet
 * (03-DATA-MODEL.md), so this can't filter *which* courses show,
 * only who the page is currently "for" (see the note rendered on
 * the dashboard when a specific child is active).
 */
export default function LearnerSwitcher({
  students,
  active,
  onSelect,
  loading = false,
}: Props) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-playful p-4 sm:p-5 mb-8">
      <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full bg-brand/5 blur-2xl" />

      <div className="relative flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-violet-100 text-brand flex items-center justify-center flex-shrink-0">
            <GraduationCap size={16} />
          </span>
          <h2 className="font-heading text-sm font-bold text-gray-800">
            Your Children
          </h2>
          {!loading && students.length > 0 && (
            <span className="text-xs font-bold text-brand bg-violet-100 px-2 py-0.5 rounded-full">
              {students.length}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="relative flex items-center gap-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-11 w-32 rounded-full bg-violet-50 animate-pulse"
            />
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            You haven&apos;t added a child profile yet — add one to start
            browsing and (soon) enrolling them in courses.
          </p>
          <Link
            href="/parent/students/new"
            className="inline-flex items-center justify-center gap-2 flex-shrink-0 text-sm font-bold text-white bg-brand hover:bg-brand-dark transition-colors px-4 py-2 rounded-full"
          >
            <Plus size={15} />
            Add a learner
          </Link>
        </div>
      ) : (
        <div className="relative flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <Tab
            active={active === "all"}
            icon={<Users size={16} />}
            label="All"
            onClick={() => onSelect("all")}
          />

          {students.map((student) => {
            const name = student.visibleName || student.firstName;
            const subtitle = [student.standard, student.board]
              .filter(Boolean)
              .join(" · ");

            return (
              <Tab
                key={student.id}
                active={active === student.id}
                avatar={
                  <ChildAvatar
                    src={student.photoViewUrl}
                    name={name}
                    size="sm"
                  />
                }
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
            <span className="w-9 h-9 rounded-full bg-violet-50 flex items-center justify-center flex-shrink-0">
              <Plus size={16} />
            </span>
            <span className="text-sm font-bold whitespace-nowrap">
              Add a learner
            </span>
          </Link>
        </div>
      )}
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
          ? "bg-brand border-brand text-white shadow-playful scale-[1.02]"
          : "bg-white border-violet-100 text-gray-700 hover:border-brand-light"
      }`}
    >
      {avatar ?? (
        <span
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
            active ? "bg-white/20" : "bg-violet-50 text-brand"
          }`}
        >
          {icon}
        </span>
      )}

      <span className="text-left leading-tight">
        <span className="block text-sm font-bold whitespace-nowrap">{label}</span>
        {subtitle && (
          <span
            className={`block text-[11px] font-normal whitespace-nowrap ${
              active ? "text-white/80" : "text-gray-400"
            }`}
          >
            {subtitle}
          </span>
        )}
      </span>
    </button>
  );
}
