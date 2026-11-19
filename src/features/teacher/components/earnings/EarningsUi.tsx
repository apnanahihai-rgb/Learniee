import type { ReactNode } from "react";

/** Shared pieces of the Teacher Earnings design (summary card, section heading, status tag line). */

/** Design `.rcard` with `.wl` label and `.ramt` amount. */
export function SumCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-[18px] border border-pd-line bg-white p-[18px]">
      <span className="text-[13px] font-semibold text-pd-ink3">{label}</span>
      <div className="font-heading text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-pd-ink">
        {value}
      </div>
    </div>
  );
}

/** Design `.sec > h2`. */
export function SectionTitle({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mb-3 font-heading text-[19px] font-semibold text-pd-ink">
      {children}
    </h2>
  );
}

/** Design `.banner` (amber notice with an optional action on the right). */
export function Notice({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-pd-amber-bg px-4 py-3 text-sm font-bold text-pd-amber">
      <span className="min-w-0 flex-1">{children}</span>
      {action}
    </div>
  );
}
