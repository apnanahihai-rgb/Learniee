"use client";

import { useMemo } from "react";

import {
  buildCyclePlan,
  formatCycleRange,
  formatDayMonth,
  type PlanType,
} from "@/features/shared/utils/cyclePlan";
import { WEEKDAY_LABELS } from "@/features/shared/utils/weekdays";
import { addDays, toDateKey, weekdayOf } from "@/lib/platformTime";

interface Props {
  /** First day of the cycle, "YYYY-MM-DD" (platform timezone). */
  startDateKey: string;
  planType?: PlanType;
  /** Selected class dates, "YYYY-MM-DD". */
  selected: string[];
  onToggle: (dateKey: string) => void;
  onClear?: () => void;
}

/**
 * "Complete month plan" date picker: every day of the cycle window
 * (start date to the same date next month minus one day) as a small
 * calendar the parent taps to switch class days on and off — any
 * combination, not a repeating weekday pattern. The window comes from
 * the same `buildCyclePlan()` the server uses, so what's shown here is
 * exactly what the server will accept.
 */
export default function CustomDatePicker({
  startDateKey,
  planType = "MONTHLY",
  selected,
  onToggle,
  onClear,
}: Props) {
  const cycleWindow = useMemo(
    () => buildCyclePlan(startDateKey, [], planType),
    [startDateKey, planType],
  );

  const cells = useMemo(() => {
    if (!cycleWindow) return [];

    return Array.from({ length: cycleWindow.cycleLengthDays }, (_, index) => {
      const date = addDays(cycleWindow.startDate, index);

      return { date, key: toDateKey(date) };
    });
  }, [cycleWindow]);

  if (!cycleWindow) {
    return (
      <p className="text-xs text-gray-400">
        Pick a start date first, then choose your class dates.
      </p>
    );
  }

  const selectedSet = new Set(selected);
  const leadingBlanks = weekdayOf(cycleWindow.startDate);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-gray-500">
          {formatCycleRange(cycleWindow)} · tap the days you want classes
        </p>
        {onClear && selected.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-bold text-brand-dark hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className="text-[10px] font-bold text-gray-400 text-center uppercase"
          >
            {label}
          </span>
        ))}

        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`blank-${i}`} aria-hidden="true" />
        ))}

        {cells.map(({ date, key }, index) => {
          const active = selectedSet.has(key);
          const showMonth = index === 0 || date.day === 1;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              aria-pressed={active}
              aria-label={formatDayMonth(date)}
              className={`flex flex-col items-center justify-center rounded-lg border py-1 text-xs font-bold transition-colors ${
                active
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-gray-600 border-violet-100 hover:border-brand/40"
              }`}
            >
              <span>{date.day}</span>
              <span
                className={`text-[9px] font-semibold leading-none h-2 ${
                  active ? "text-white/80" : "text-gray-400"
                }`}
              >
                {showMonth ? formatDayMonth(date).split(" ")[1] : ""}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-gray-500 mt-2">
        {selected.length} date{selected.length === 1 ? "" : "s"} selected
      </p>
    </div>
  );
}
