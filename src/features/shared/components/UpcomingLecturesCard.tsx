"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, PlayCircle, Video } from "lucide-react";

import type { CalendarOccurrence } from "@/features/shared/types/calendar";
import { formatScheduleTime } from "@/features/shared/utils/weekdays";
import { isSessionLive, todayKey } from "@/features/shared/utils/classSessionWindow";

interface Props {
  occurrences: CalendarOccurrence[];
  loading: boolean;
  role: "parent" | "teacher";
  limit?: number;
}

const DEFAULT_LIMIT = 6;

/**
 * Today's and upcoming scheduled lectures for a Parent or Teacher —
 * today's occurrence(s) are visually highlighted. The action button
 * (Join for Parent, Start Session for Teacher) is only clickable
 * once `isSessionLive` says the scheduled time has actually arrived
 * (see classSessionWindow.ts) — visible either way, so the person
 * can always see what's coming up, just can't act on it early.
 *
 * Reads from the same `/api/parent/calendar` / `/api/teacher/calendar`
 * occurrences the existing calendar pages already use (current month
 * only — a session scheduled early next month won't show here until
 * that month is loaded, same limitation the old "Upcoming classes"
 * dashboard section already had).
 */
export default function UpcomingLecturesCard({
  occurrences,
  loading,
  role,
  limit = DEFAULT_LIMIT,
}: Props) {
  const router = useRouter();
  const today = todayKey();

  const upcoming = [...occurrences]
    .filter((o) => o.status === "SCHEDULED" && o.date >= today)
    .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))
    .slice(0, limit);

  function goToSession(occ: CalendarOccurrence) {
    router.push(
      role === "teacher"
        ? `/teacher/classes/${occ.id}/start`
        : `/parent/classes/${occ.id}/join`,
    );
  }

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-violet-100 bg-violet-50/60 animate-pulse h-28"
          />
        ))}
      </div>
    );
  }

  if (upcoming.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-6 text-center text-sm text-gray-500">
        No lectures scheduled yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {upcoming.map((occ) => {
        const isToday = occ.date === today;
        const live = isSessionLive(occ.date, occ.time);
        const otherParty = role === "teacher" ? occ.studentName : occ.teacherName;
        const actionLabel = role === "teacher" ? "Start Session" : "Join Session";

        return (
          <div
            key={occ.id}
            className={`rounded-2xl p-4 border transition-shadow ${
              isToday
                ? "border-brand-yellow bg-amber-50 shadow-playful"
                : "border-violet-100 bg-white"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand">
                <CalendarClock size={13} />
                {isToday ? "Today" : occ.date}
                {occ.time ? ` · ${formatScheduleTime(occ.time)}` : ""}
              </div>
              {isToday && (
                <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Today
                </span>
              )}
            </div>

            <p className="text-sm font-semibold text-gray-800 truncate">
              {otherParty}
            </p>
            <p className="text-xs text-gray-500 truncate mb-3">
              {occ.courseTitle || occ.subject || "Course"}
            </p>

            <button
              type="button"
              disabled={!live}
              onClick={() => goToSession(occ)}
              title={
                live
                  ? undefined
                  : "This becomes available at the scheduled time."
              }
              className={`w-full flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full transition-colors ${
                live
                  ? "text-white bg-green-600 hover:bg-green-700"
                  : "text-gray-400 bg-gray-100 cursor-not-allowed"
              }`}
            >
              {role === "teacher" ? <PlayCircle size={14} /> : <Video size={14} />}
              {actionLabel}
            </button>
          </div>
        );
      })}
    </div>
  );
}
