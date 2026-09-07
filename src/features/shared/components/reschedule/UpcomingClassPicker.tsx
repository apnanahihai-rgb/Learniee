"use client";

import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";

import type { CalendarOccurrence } from "@/features/shared/types/calendar";
import { formatScheduleTime } from "@/features/shared/utils/weekdays";

interface Props {
  occurrences: CalendarOccurrence[];
  loading: boolean;
  role: "parent" | "teacher";
  limit?: number;
}

const DEFAULT_LIMIT = 8;

/**
 * Upcoming SCHEDULED classes for the current month, each with a
 * "Reschedule" action — the entry point for raising a new
 * RescheduleRequest, now surfaced directly on the Reschedule page
 * itself (both /parent/reschedule and /teacher/reschedule) rather
 * than scattered across the Home dashboard and Calendar page.
 *
 * Reads from the same `/api/parent/calendar` / `/api/teacher/calendar`
 * occurrences those other pages already use (current month only —
 * a class scheduled early next month won't show here until that
 * month is loaded).
 */
export default function UpcomingClassPicker({
  occurrences,
  loading,
  role,
  limit = DEFAULT_LIMIT,
}: Props) {
  const router = useRouter();

  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const upcoming = [...occurrences]
    .filter((o) => o.status === "SCHEDULED" && o.date >= today)
    .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))
    .slice(0, limit);

  function goToReschedule(occ: CalendarOccurrence) {
    router.push(
      role === "teacher"
        ? `/teacher/classes/${occ.id}/reschedule`
        : `/parent/classes/${occ.id}/reschedule`,
    );
  }

  if (loading) {
    return (
      <div className="grid gap-2.5 sm:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-violet-100 bg-violet-50/60 animate-pulse h-20"
          />
        ))}
      </div>
    );
  }

  if (upcoming.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-violet-200 rounded-2xl p-5 text-center text-sm text-gray-500">
        No upcoming classes to reschedule right now.
      </div>
    );
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {upcoming.map((occ) => {
        const otherParty = role === "teacher" ? occ.studentName : occ.teacherName;

        return (
          <div
            key={occ.id}
            className="rounded-2xl border border-violet-100 bg-white p-3.5 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[11px] font-bold text-brand mb-1">
                <CalendarClock size={11} />
                {occ.date}
                {occ.time ? ` · ${formatScheduleTime(occ.time)}` : ""}
              </div>
              <p className="text-sm font-semibold text-gray-800 truncate">
                {otherParty}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {occ.courseTitle || occ.subject || "Course"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => goToReschedule(occ)}
              className="flex-shrink-0 text-xs font-bold text-white bg-brand hover:bg-brand-dark px-3 py-2 rounded-full transition-colors"
            >
              Reschedule
            </button>
          </div>
        );
      })}
    </div>
  );
}
