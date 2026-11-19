"use client";

import type { ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

import { PD_BTN_PRI } from "@/features/parent/components/courses/pdUi";

/** Shared pieces of the Teacher "Requests" design (loading, error, form field). */

/** Design `.sk` blocks while a tab loads. */
export function RequestsSkeleton({ rows = 3, height = 150 }: { rows?: number; height?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="mt-5 flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="animate-pulse rounded-2xl bg-[#eeeaf7]" style={{ height }} />
      ))}
    </div>
  );
}

/** Design "Something went wrong" card with a Retry button. */
export function RequestsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mt-5 rounded-[20px] border border-pd-line bg-white p-5">
      <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <span className="grid size-14 place-items-center rounded-[14px] bg-pd-red-bg text-pd-red">
          <AlertTriangle size={26} />
        </span>
        <h3 className="font-heading text-lg font-semibold text-pd-ink">Something went wrong</h3>
        <p className="max-w-[360px] text-sm text-pd-ink3">{message}</p>
        <button type="button" className={PD_BTN_PRI} onClick={onRetry}>
          <RotateCw size={16} />
          Retry
        </button>
      </div>
    </div>
  );
}

/** Design `.field`: label above a control, optional inline error below. */
export function Field({
  id,
  label,
  error,
  children,
}: {
  id?: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-semibold text-pd-ink2">
        {label}
      </label>
      {children}
      {error && (
        <span role="alert" className="text-xs font-bold text-pd-red">
          {error}
        </span>
      )}
    </div>
  );
}
