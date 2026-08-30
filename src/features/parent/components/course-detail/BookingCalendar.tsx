"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// A fixed set of hourly slots covering a typical teaching day.
// There's no Teacher-side "availability" data yet (Enrollment /
// ClassSession aren't modeled — see 03-DATA-MODEL.md), so this is
// a representative fixed list rather than anything pulled from a
// real schedule.
const TIME_SLOT_HOURS = [9, 10, 11, 12, 14, 15, 16, 17, 18, 19];

function formatHour(hour: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface Props {
  selectedDate: Date | null;
  selectedHour: number | null;
  onSelectDate: (date: Date) => void;
  onSelectHour: (hour: number) => void;
}

/**
 * A self-contained month + time-slot picker. Purely a UI preview
 * for now — Enrollment / DemoCoupon / ClassSession aren't modeled
 * yet (03-DATA-MODEL.md), so nothing here is persisted. Selection
 * state lives in the parent (BookingPanel) so it can show a
 * summary line and, later, hand the choice straight to a real
 * booking API without this component changing shape.
 *
 * Times are shown in the browser's local timezone via
 * Intl.DateTimeFormat — there's no Teacher timezone field in the
 * data model yet, so converting to "the teacher's local time" is a
 * TODO for whenever that's added (see the note rendered below the
 * slot grid).
 */
export default function BookingCalendar({
  selectedDate,
  selectedHour,
  onSelectDate,
  onSelectHour,
}: Props) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const localTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );

  const monthLabel = visibleMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const canGoToPreviousMonth =
    visibleMonth.getFullYear() > today.getFullYear() ||
    (visibleMonth.getFullYear() === today.getFullYear() &&
      visibleMonth.getMonth() > today.getMonth());

  const days = useMemo(() => {
    const firstOfMonth = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      1,
    );
    const leadingBlanks = firstOfMonth.getDay();
    const daysInMonth = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + 1,
      0,
    ).getDate();

    const cells: (Date | null)[] = Array(leadingBlanks).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(
        new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day),
      );
    }

    return cells;
  }, [visibleMonth]);

  return (
    <div>
      {/* MONTH NAV */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() =>
            setVisibleMonth(
              (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
            )
          }
          disabled={!canGoToPreviousMonth}
          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-violet-50 disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>

        <p className="text-sm font-bold text-gray-700">{monthLabel}</p>

        <button
          type="button"
          onClick={() =>
            setVisibleMonth(
              (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
            )
          }
          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-violet-50"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* WEEKDAY HEADER */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={i}
            className="text-center text-[11px] font-bold text-gray-400"
          >
            {label}
          </div>
        ))}
      </div>

      {/* DATE GRID */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, i) => {
          if (!date) {
            return <div key={`blank-${i}`} />;
          }

          const isPast = date < today;
          const isSelected = selectedDate && isSameDay(date, selectedDate);

          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={isPast}
              onClick={() => onSelectDate(date)}
              className={`aspect-square rounded-xl text-xs font-semibold flex items-center justify-center transition-colors ${
                isSelected
                  ? "bg-brand text-white shadow-sm"
                  : isPast
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-600 hover:bg-violet-50"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* TIME SLOTS */}
      <div className="mt-5">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          Available times
        </p>

        <div className="grid grid-cols-2 gap-2">
          {TIME_SLOT_HOURS.map((hour) => {
            const isSelected = selectedHour === hour;

            return (
              <button
                key={hour}
                type="button"
                disabled={!selectedDate}
                onClick={() => onSelectHour(hour)}
                className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${
                  isSelected
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-gray-600 border-violet-100 hover:border-brand disabled:opacity-40 disabled:hover:border-violet-100"
                }`}
              >
                {formatHour(hour)}
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
          Times shown in your local timezone ({localTimezone}). Once teacher
          availability and timezones are tracked, this will convert to the
          teacher&apos;s local time automatically.
        </p>
      </div>
    </div>
  );
}
