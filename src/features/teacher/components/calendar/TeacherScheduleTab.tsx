"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";

import PdDayList from "@/features/parent/components/calendar/PdDayList";
import PdMonthGrid from "@/features/parent/components/calendar/PdMonthGrid";
import {
  groupByDay,
  monthKeyOf,
  shiftMonth,
  type CalEvent,
} from "@/features/parent/components/calendar/calendarLogic";
import { PdEmpty } from "@/features/parent/components/courses/pdUi";
import { KID_PALETTE, dayKey, fmtTime } from "@/features/parent/components/home/homeLogic";
import { firstWord } from "@/features/parent/components/my-classes/pdClassesUi";
import {
  teacherDemoToEvent,
  teacherOccurrenceToEvent,
} from "@/features/teacher/components/calendar/teacherCalendarLogic";
import { RequestsError } from "@/features/teacher/components/requests/RequestsUi";
import { useTeacherCalendar } from "@/features/teacher/hooks/useCalendar";
import { useTeacherDemoBookings } from "@/features/teacher/hooks/useDemoBookings";

function ScheduleSkeleton() {
  const block = "animate-pulse rounded-2xl bg-[#eeeaf7]";

  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className="mt-5 flex flex-col gap-6 min-[1180px]:grid min-[1180px]:grid-cols-[minmax(0,1fr)_340px] min-[1180px]:items-start"
    >
      <div className={`${block} h-[520px]`} />
      <div className={`${block} h-48`} />
    </div>
  );
}

/**
 * Teacher Calendar → Schedule: every class and demo in the visible month,
 * coloured per student. Classes come from `/api/teacher/calendar`, demos from
 * `/api/teacher/demo-bookings`.
 */
export default function TeacherScheduleTab() {
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(monthKeyOf(now));
  const [selected, setSelected] = useState(dayKey(now));

  const { occurrences, loading, error, reload } = useTeacherCalendar(month);
  const { bookings, loading: demosLoading } = useTeacherDemoBookings();

  const events = useMemo(() => {
    const [y, m] = month.split("-").map(Number);

    return [...occurrences.map(teacherOccurrenceToEvent), ...bookings.map(teacherDemoToEvent)]
      .filter((e): e is CalEvent => e !== null)
      .filter((e) => e.start.getFullYear() === y && e.start.getMonth() === m - 1);
  }, [occurrences, bookings, month]);

  const byDay = useMemo(() => groupByDay(events), [events]);

  // One colour per student, ordered by id so it stays the same from month to month.
  const colors = useMemo(() => {
    const ids = [...new Set(events.map((e) => e.studentId))].sort();
    return new Map(ids.map((id, i) => [id, KID_PALETTE[i % KID_PALETTE.length]]));
  }, [events]);
  const colorOf = (e: CalEvent) => colors.get(e.studentId) ?? null;

  const dayEvents = byDay.get(selected) ?? [];

  function goToMonth(delta: number) {
    const next = shiftMonth(month, delta);
    setMonth(next);
    // Keep a valid selection: today in the current month, else the 1st.
    setSelected(next === monthKeyOf(now) ? dayKey(now) : dayKey(new Date(`${next}-01T00:00:00`)));
  }

  if (error && occurrences.length === 0) {
    return <RequestsError message={error} onRetry={reload} />;
  }

  if ((loading || demosLoading) && occurrences.length === 0 && events.length === 0) {
    return <ScheduleSkeleton />;
  }

  return (
    <div className="mt-5 flex flex-col gap-6 min-[1180px]:grid min-[1180px]:grid-cols-[minmax(0,1fr)_340px] min-[1180px]:items-start">
      <PdMonthGrid
        month={month}
        selected={selected}
        byDay={byDay}
        colorOf={colorOf}
        legend={[]}
        busy={loading}
        dayNames="short"
        splitHeader
        chipText={(e) => firstWord(e.studentName)}
        onSelect={setSelected}
        onPrev={() => goToMonth(-1)}
        onNext={() => goToMonth(1)}
      />

      <section
        aria-labelledby="cal-day"
        className="min-w-0 overflow-hidden rounded-2xl border border-pd-line bg-white"
      >
        <h2
          id="cal-day"
          className="px-5 pt-4 pb-1 font-heading text-[19px] font-semibold text-pd-ink"
        >
          Selected day
        </h2>
        <PdDayList
          bare
          events={dayEvents}
          colorOf={colorOf}
          subtitle={(e) =>
            `${e.studentName}${e.kind === "demo" ? " · Demo" : ""}${e.hasTime ? ` · ${fmtTime(e.start)}` : ""}`
          }
          empty={
            <PdEmpty icon={CalendarDays} title="Free day" text="No classes on this day." />
          }
        />
      </section>
    </div>
  );
}
