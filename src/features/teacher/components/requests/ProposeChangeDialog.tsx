"use client";

import { useState } from "react";

import CustomDatePicker from "@/features/shared/components/CustomDatePicker";
import PdDialog from "@/features/shared/components/PdDialog";
import { shiftCustomDateKeys } from "@/features/shared/utils/cyclePlan";
import { WEEKDAY_LABELS, toggleWeekday } from "@/features/shared/utils/weekdays";
import {
  PD_BTN_PRI,
  PD_BTN_SEC,
  PD_INPUT,
  pillFilter,
} from "@/features/parent/components/courses/pdUi";
import { TD_TEXTAREA } from "@/features/teacher/components/my-classes/TeacherUi";
import type { RevisionInput } from "@/features/teacher/components/enrollments/RevisionForm";
import { Field } from "./RequestsUi";

interface Props {
  isLegacy: boolean;
  /** The parent picked exact dates ("Complete month plan") instead of weekdays. */
  isCustomPlan: boolean;
  currentStartDate: string;
  currentCustomDates: string[];
  minStartDate: string;
  busy?: boolean;
  onSubmit: (input: RevisionInput) => void;
  onClose: () => void;
}

/** "Propose a change": new start date and/or weekly schedule, plus a required note to the parent. */
export default function ProposeChangeDialog({
  isLegacy,
  isCustomPlan,
  currentStartDate,
  currentCustomDates,
  minStartDate,
  busy = false,
  onSubmit,
  onClose,
}: Props) {
  const [date, setDate] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [time, setTime] = useState("");
  const [sessions, setSessions] = useState("");
  const [customDates, setCustomDates] = useState<string[] | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");

  // Custom plan: until the teacher edits, the parent's dates move with a new start date.
  const windowStart = date || currentStartDate;
  const shownDates =
    customDates ??
    (date && currentStartDate
      ? shiftCustomDateKeys(currentCustomDates, currentStartDate, date)
      : currentCustomDates);

  function toggleDate(key: string) {
    setCustomDates(
      shownDates.includes(key) ? shownDates.filter((k) => k !== key) : [...shownDates, key].sort(),
    );
  }

  function submit() {
    if (note.trim().length < 5) {
      setNoteError("Please explain the change.");
      return;
    }

    onSubmit({
      note: note.trim(),
      cycleStartDate: date || undefined,
      sessionsPerMonth: isLegacy && sessions ? Number(sessions) : undefined,
      scheduleDays: isCustomPlan ? undefined : days.length ? days : undefined,
      scheduleTime: time || undefined,
      // Only sent when the teacher changed the dates; otherwise the server keeps them.
      customDates: isCustomPlan && customDates ? customDates : undefined,
    });
  }

  return (
    <PdDialog
      title="Propose a change"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={PD_BTN_SEC} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={PD_BTN_PRI} onClick={submit} disabled={busy}>
            {busy ? "Sending…" : "Send to parent"}
          </button>
        </>
      }
    >
      <p className="text-[13px] text-pd-ink3">
        Suggest a new start date or weekly schedule. The session count and price are recalculated
        (minimum 4 sessions). Times are IST.
      </p>

      <Field id="pd-date" label="New start date">
        <input
          id="pd-date"
          type="date"
          min={isLegacy ? undefined : minStartDate}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={PD_INPUT}
        />
      </Field>

      {isLegacy && (
        <Field id="pd-sessions" label="New sessions per month">
          <input
            id="pd-sessions"
            type="number"
            min={4}
            max={31}
            value={sessions}
            onChange={(e) => setSessions(e.target.value)}
            className={PD_INPUT}
          />
        </Field>
      )}

      {isCustomPlan ? (
        <Field label={`Class dates (${shownDates.length} selected)`}>
          <CustomDatePicker startDateKey={windowStart} selected={shownDates} onToggle={toggleDate} />
        </Field>
      ) : (
        <Field label="Weekly days">
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, day) => (
              <button
                key={label}
                type="button"
                aria-pressed={days.includes(day)}
                className={pillFilter(days.includes(day))}
                onClick={() => setDays((c) => toggleWeekday(c, day))}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
      )}

      <Field id="pd-time" label="Class time">
        <input id="pd-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={PD_INPUT} />
      </Field>

      <Field id="pd-note" label="Note to the parent (required)" error={noteError}>
        <textarea
          id="pd-note"
          maxLength={500}
          value={note}
          aria-invalid={!!noteError}
          onChange={(e) => {
            setNote(e.target.value);
            setNoteError("");
          }}
          className={TD_TEXTAREA}
        />
      </Field>
    </PdDialog>
  );
}
