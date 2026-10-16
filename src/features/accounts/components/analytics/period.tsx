"use client";

import { useMemo, useState } from "react";

import { daysInMonth, toDateKey, todayInPlatformTz, type CalendarDate } from "@/lib/platformTime";
import { cx, adminInputClass } from "@/features/admin/components/ui/primitives";
import { PRESETS, type PresetId } from "./constants";

function presetRange(preset: PresetId): { from?: string; to?: string } {
  const today = todayInPlatformTz();

  if (preset === "all") return {};

  if (preset === "this_month") {
    const from: CalendarDate = { year: today.year, month: today.month, day: 1 };
    return { from: toDateKey(from), to: toDateKey(today) };
  }

  if (preset === "last_month") {
    const year = today.month === 1 ? today.year - 1 : today.year;
    const month = today.month === 1 ? 12 : today.month - 1;
    const from: CalendarDate = { year, month, day: 1 };
    const to: CalendarDate = { year, month, day: daysInMonth(year, month) };
    return { from: toDateKey(from), to: toDateKey(to) };
  }

  if (preset === "this_year") {
    const from: CalendarDate = { year: today.year, month: 1, day: 1 };
    return { from: toDateKey(from), to: toDateKey(today) };
  }

  // "custom" is resolved by the caller from the date inputs, not here.
  return {};
}

/**
 * One independent "Period" selection (preset + optional custom range + derived
 * label). The page-level filter and the Build Your Own Breakdown panel each
 * hold their own, so switching one never moves the other.
 */
export function usePeriodRange() {
  const [preset, setPreset] = useState<PresetId>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo(() => {
    if (preset === "custom") {
      return { from: customFrom || undefined, to: customTo || undefined };
    }
    return presetRange(preset);
  }, [preset, customFrom, customTo]);

  const rangeLabel = useMemo(() => {
    if (preset !== "custom") return PRESETS.find((p) => p.id === preset)?.label ?? "";
    if (range.from && range.to) return `${range.from} to ${range.to}`;
    if (range.from) return `From ${range.from}`;
    if (range.to) return `Up to ${range.to}`;
    return "All Time";
  }, [preset, range]);

  return { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, range, rangeLabel };
}

interface PickerProps {
  preset: PresetId;
  onPresetChange: (p: PresetId) => void;
  customFrom: string;
  onCustomFromChange: (v: string) => void;
  customTo: string;
  onCustomToChange: (v: string) => void;
}

function CustomRange({ customFrom, onCustomFromChange, customTo, onCustomToChange }: Omit<PickerProps, "preset" | "onPresetChange">) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <input
        aria-label="From date"
        type="date"
        value={customFrom}
        max={customTo || undefined}
        onChange={(e) => onCustomFromChange(e.target.value)}
        className={cx(adminInputClass, "sm:w-44")}
      />
      <span className="text-sm text-admin-muted">to</span>
      <input
        aria-label="To date"
        type="date"
        value={customTo}
        min={customFrom || undefined}
        onChange={(e) => onCustomToChange(e.target.value)}
        className={cx(adminInputClass, "sm:w-44")}
      />
    </span>
  );
}

/** Row of period chips (plus custom date inputs). */
export function PeriodPicker(props: PickerProps) {
  const { preset, onPresetChange } = props;

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Period">
      {PRESETS.map((p) => {
        const active = preset === p.id;

        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onPresetChange(p.id)}
            aria-pressed={active}
            className={cx(
              "inline-flex min-h-11 items-center rounded-[14px] border px-4 text-[15px] font-bold transition-colors",
              active
                ? "border-brand bg-brand text-white"
                : "border-admin-line bg-white text-admin-ink hover:bg-admin-hover",
            )}
          >
            {p.label}
          </button>
        );
      })}
      {preset === "custom" && <CustomRange {...props} />}
    </div>
  );
}

/** Compact select version of the same picker, for use inside a panel header. */
export function PeriodSelect({ id, ...props }: PickerProps & { id: string }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor={id} className="mb-1 block text-[13px] font-extrabold text-admin-muted">
          Period
        </label>
        <select
          id={id}
          value={props.preset}
          onChange={(e) => props.onPresetChange(e.target.value as PresetId)}
          className={cx(adminInputClass, "sm:w-[200px]")}
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      {props.preset === "custom" && <CustomRange {...props} />}
    </div>
  );
}
