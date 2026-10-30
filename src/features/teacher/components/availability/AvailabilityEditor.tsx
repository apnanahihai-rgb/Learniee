"use client";

import { useState } from "react";
import { Copy, Loader2, Plus, X } from "lucide-react";

import {
  MAX_SLOTS_PER_DAY,
  type AvailabilitySlot,
} from "@/features/shared/utils/availability";
import { WEEKDAY_LABELS_FULL } from "@/features/shared/utils/weekdays";

interface Range {
  start: string;
  end: string;
}

type Week = Record<number, Range[]>;

const DEFAULT_RANGE: Range = { start: "16:00", end: "20:00" };
// Monday first reads more naturally than Sunday first.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function toWeek(slots: AvailabilitySlot[]): Week {
  const week: Week = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const s of slots) {
    week[s.dayOfWeek].push({ start: s.startTime, end: s.endTime });
  }
  return week;
}

function toSlots(week: Week): AvailabilitySlot[] {
  return DAY_ORDER.flatMap((day) =>
    week[day].map((r) => ({ dayOfWeek: day, startTime: r.start, endTime: r.end })),
  );
}

interface Props {
  initialSlots: AvailabilitySlot[];
  saving: boolean;
  /** Server error from the last save. */
  error?: string;
  submitLabel?: string;
  onSave: (slots: AvailabilitySlot[]) => void | Promise<unknown>;
}

/**
 * Weekly availability editor. The week set here repeats every week (IST),
 * and is the only source of timings Parents can book demos and classes in.
 */
export default function AvailabilityEditor({
  initialSlots,
  saving,
  error,
  submitLabel = "Save availability",
  onSave,
}: Props) {
  const [week, setWeek] = useState<Week>(() => toWeek(initialSlots));
  const [localError, setLocalError] = useState("");

  function update(day: number, ranges: Range[]) {
    setWeek((prev) => ({ ...prev, [day]: ranges }));
    setLocalError("");
  }

  function toggleDay(day: number) {
    update(day, week[day].length > 0 ? [] : [{ ...DEFAULT_RANGE }]);
  }

  function copyToAll(fromDay: number) {
    setWeek((prev) => {
      const next = { ...prev };
      for (const day of DAY_ORDER) {
        next[day] = prev[fromDay].map((r) => ({ ...r }));
      }
      return next;
    });
  }

  function handleSave() {
    for (const day of DAY_ORDER) {
      for (const r of week[day]) {
        if (!r.start || !r.end || r.end <= r.start) {
          setLocalError(
            `${WEEKDAY_LABELS_FULL[day]}: each slot must end after it starts.`,
          );
          return;
        }
      }
    }

    const slots = toSlots(week);

    if (slots.length === 0) {
      setLocalError("Turn on at least one day and add a time slot.");
      return;
    }

    onSave(slots);
  }

  const inputClass =
    "text-sm border border-violet-100 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30";

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Times are in IST. This week repeats every week until you change it.
      </p>

      <div className="space-y-2">
        {DAY_ORDER.map((day) => {
          const ranges = week[day];
          const on = ranges.length > 0;

          return (
            <div
              key={day}
              className="flex flex-col sm:flex-row sm:items-start gap-2 rounded-xl border border-violet-100 bg-white px-3 py-2.5"
            >
              <label className="flex items-center gap-2 sm:w-36 flex-shrink-0 pt-1.5">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleDay(day)}
                  className="size-4 accent-violet-600"
                />
                <span className="text-sm font-semibold text-gray-700">
                  {WEEKDAY_LABELS_FULL[day]}
                </span>
              </label>

              <div className="flex-1 space-y-1.5">
                {on ? (
                  ranges.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={r.start}
                        onChange={(e) =>
                          update(
                            day,
                            ranges.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)),
                          )
                        }
                        className={inputClass}
                        aria-label={`${WEEKDAY_LABELS_FULL[day]} slot ${i + 1} start`}
                      />
                      <span className="text-xs text-gray-400">to</span>
                      <input
                        type="time"
                        value={r.end}
                        onChange={(e) =>
                          update(
                            day,
                            ranges.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)),
                          )
                        }
                        className={inputClass}
                        aria-label={`${WEEKDAY_LABELS_FULL[day]} slot ${i + 1} end`}
                      />
                      <button
                        type="button"
                        onClick={() => update(day, ranges.filter((_, j) => j !== i))}
                        className="p-1 text-gray-400 hover:text-red-500"
                        aria-label="Remove slot"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 pt-2">Not available</p>
                )}

                {on && (
                  <div className="flex items-center gap-3 pt-0.5">
                    {ranges.length < MAX_SLOTS_PER_DAY && (
                      <button
                        type="button"
                        onClick={() => update(day, [...ranges, { start: "09:00", end: "12:00" }])}
                        className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                      >
                        <Plus size={12} /> Add slot
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => copyToAll(day)}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-brand"
                    >
                      <Copy size={12} /> Copy to all days
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(localError || error) && (
        <p className="text-xs text-red-600 mt-3">{localError || error}</p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-4 w-full sm:w-auto text-sm font-bold text-white bg-brand px-6 py-2.5 rounded-full disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        {submitLabel}
      </button>
    </div>
  );
}
