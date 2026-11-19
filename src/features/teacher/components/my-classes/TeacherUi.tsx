"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import PdDialog from "@/features/shared/components/PdDialog";
import {
  PD_BTN_DNG,
  PD_BTN_PRI,
  PD_BTN_SEC,
  pillFilter,
} from "@/features/parent/components/courses/pdUi";

/** Shared pieces of the Teacher "My classes" design (cards, list rows, pills, notices, confirm dialog). */

/** Design `.card.flush`: white panel whose rows touch the edges. */
export const TD_CARD = "overflow-hidden rounded-2xl border border-pd-line bg-white";
/** Design `.li`: one row inside a flush card. */
export const TD_ROW =
  "flex flex-wrap items-center gap-3 border-t border-pd-line px-[18px] py-3 first:border-t-0";
export const TD_GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2 min-[1180px]:grid-cols-3";
export const TD_SELECT =
  "h-[46px] w-full rounded-xl border border-pd-line2 bg-white px-3 text-sm text-pd-ink outline-none transition focus:border-pd-brand focus:ring-4 focus:ring-pd-b100";
export const TD_TEXTAREA =
  "min-h-[88px] w-full resize-y rounded-xl border border-pd-line2 bg-white px-4 py-3 text-sm text-pd-ink outline-none transition focus:border-pd-brand focus:ring-4 focus:ring-pd-b100";

const AVATAR_COLORS = ["#5931a2", "#0d9488", "#d97706", "#2563eb", "#db2777", "#7c3aed", "#059669"];

/** Stable avatar colour per person name. */
export function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;

  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export const dShort = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Row above a list: a muted hint on the left and the primary action on the right (design `.ph2`). */
export function ActionBar({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-pd-ink3">{text}</span>
      {action}
    </div>
  );
}

/** "All courses" + one pill per course (design `.pillf`). */
export function CoursePills({
  courses,
  value,
  onChange,
}: {
  courses: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mb-3.5 mt-5 flex flex-wrap gap-2">
      <button type="button" aria-pressed={value === "all"} className={pillFilter(value === "all")} onClick={() => onChange("all")}>
        All courses
      </button>
      {courses.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-pressed={value === c.id}
          className={pillFilter(value === c.id)}
          onClick={() => onChange(c.id)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

/** Short success message (design toast) shown above the list; clears itself. */
export function useNotice() {
  const [text, setText] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const show = useCallback((message: string) => {
    setText(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setText(""), 4000);
  }, []);

  const node = text ? (
    <div
      role="status"
      aria-live="polite"
      className="mt-3 rounded-xl bg-pd-green-bg px-4 py-2.5 text-sm font-semibold text-pd-green"
    >
      {text}
    </div>
  ) : null;

  return { show, node };
}

/** Confirmation dialog used for destructive / final actions. */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  danger = false,
  busy = false,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <PdDialog
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={PD_BTN_SEC} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={danger ? PD_BTN_DNG : PD_BTN_PRI} onClick={onConfirm} disabled={busy}>
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-pd-ink2">{children}</div>
      {error && (
        <span role="alert" className="text-xs font-bold text-pd-red">
          {error}
        </span>
      )}
    </PdDialog>
  );
}
