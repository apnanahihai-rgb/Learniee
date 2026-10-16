import type { ReactNode } from "react";

import {
  AdminPanel,
  AdminPill,
  adminButtonClass,
  adminInputClass,
  adminRowClass,
  adminTdClass,
  adminThClass,
  cx,
  type PillTone,
} from "@/features/admin/components/ui/primitives";

/**
 * Presentational pieces shared by every redesigned Accounts screen (Oct 2026
 * Accounts redesign). Built on the Admin primitives so Accounts, Admin and the
 * other staff dashboards share one visual language. No hooks, so it is safe in
 * both server and client components.
 */

export { adminRowClass as rowClass, adminTdClass as tdClass, adminThClass as thClass };

export const numClass = "text-right tabular-nums";

/* ---------------------------------- KPI strip --------------------------------- */

export type KpiTone = "default" | "warn" | "brand" | "good" | "bad";

export interface KpiItem {
  label: string;
  value: ReactNode;
  tone?: KpiTone;
  /** Small line under the value, e.g. "Tuition + Demo". */
  note?: string;
  /** Optional button/link shown under the value. */
  action?: ReactNode;
}

const KPI_VALUE_TONE: Record<KpiTone, string> = {
  default: "text-admin-ink",
  warn: "text-[#6b4a00]",
  brand: "text-brand-dark",
  good: "text-emerald-700",
  bad: "text-rose-700",
};

// Static class names (Tailwind can't see interpolated ones).
const KPI_GRID: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

/** A single panel of headline numbers separated by hairlines. */
export function AccountsKpiStrip({ items, bare = false }: { items: KpiItem[]; bare?: boolean }) {
  const grid = KPI_GRID[Math.min(Math.max(items.length, 1), 4)];

  const strip = (
    <dl className={cx("grid gap-px bg-admin-line", grid)}>
        {items.map((item) => {
          const warn = item.tone === "warn";

          return (
            <div
              key={item.label}
              className={cx("flex flex-col px-5 py-[18px] sm:px-[22px]", warn ? "bg-[#fff4d1]" : "bg-white")}
            >
              <dt
                className={cx(
                  "text-[13px] font-extrabold uppercase tracking-[0.06em]",
                  warn ? "text-[#6b4a00]" : "text-admin-muted",
                )}
              >
                {item.label}
              </dt>
              <dd
                className={cx(
                  "mt-1.5 font-heading text-[28px] font-bold leading-tight tabular-nums",
                  KPI_VALUE_TONE[item.tone ?? "default"],
                )}
              >
                {item.value}
              </dd>
              {item.note && (
                <span className="mt-1 text-[13px] font-semibold text-admin-muted">{item.note}</span>
              )}
              {item.action && <div className="mt-2.5">{item.action}</div>}
            </div>
          );
        })}
    </dl>
  );

  // `bare` drops the panel chrome when the strip sits inside another panel.
  return bare ? strip : <AdminPanel className="overflow-hidden">{strip}</AdminPanel>;
}

/* ----------------------------- Panel header / toolbar ----------------------------- */

export function AccountsPanelHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="font-heading text-[19px] font-bold leading-tight text-admin-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[15px] text-admin-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** The tinted filter row above a table. Put a spacer + action last. */
export function AccountsFilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-admin-line bg-admin-surface px-5 py-4">
      {children}
    </div>
  );
}

export function AccountsFilterField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 max-w-full">
      <label htmlFor={htmlFor} className="mb-1 block text-[13px] font-extrabold text-admin-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Search box / select styling inside a filter bar. */
export const filterControlClass = cx(adminInputClass, "sm:w-[220px]");

export function FilterSpacer() {
  return <span className="hidden flex-1 sm:block" aria-hidden="true" />;
}

/* ------------------------------------ Buttons ------------------------------------ */

/** Outlined red button for "Reject" style actions. */
export const rejectButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#f3b6c4] bg-white px-[18px] text-[15px] font-extrabold text-[#9f1239] transition-colors hover:bg-[#fde8ee] disabled:cursor-not-allowed disabled:opacity-50";

export function ExportLink({ href, label = "Download Excel (.xlsx)" }: { href: string; label?: string }) {
  return (
    <a href={href} className={adminButtonClass("secondary")}>
      {label}
    </a>
  );
}

/* ------------------------------------- Pills -------------------------------------- */

/** Status pill with a leading dot. */
export function StatusPill({ tone = "brand", children }: { tone?: PillTone; children: ReactNode }) {
  return (
    <AdminPill tone={tone}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </AdminPill>
  );
}

/* ------------------------------------- Tables ------------------------------------- */

/** Horizontally scrollable table body inside a panel. */
export function AccountsTable({ children, minWidth = 900 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[15px]" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function TableMessageRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-[15px] text-admin-muted">
        {children}
      </td>
    </tr>
  );
}

/** Two-line cell: main text with a smaller muted line under it. */
export function TwoLine({ primary, secondary }: { primary: ReactNode; secondary?: ReactNode }) {
  return (
    <>
      <span className="block">{primary}</span>
      {secondary ? <span className="mt-0.5 block text-[13px] text-admin-muted">{secondary}</span> : null}
    </>
  );
}

export const tfootCellClass =
  "bg-admin-surface px-5 py-3.5 font-extrabold first:pl-6 last:pr-6 border-t border-admin-line";

/* ---------------------------------- Pagination ----------------------------------- */

export function AccountsPagination({
  from,
  to,
  total,
  page,
  pageCount,
  onPage,
  noun = "results",
  extra,
}: {
  from: number;
  to: number;
  total: number;
  page: number;
  pageCount: number;
  onPage: (next: number) => void;
  noun?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-admin-line px-5 py-3 text-sm text-admin-muted">
      <span>
        {total === 0 ? `No ${noun}` : `Showing ${from}–${to} of ${total} ${noun}`}
        {extra}
      </span>
      <span className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className={adminButtonClass("secondary")}
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
          className={adminButtonClass("secondary")}
        >
          Next
        </button>
      </span>
    </div>
  );
}

/* -------------------------------- Progress indicators ------------------------------ */

/** Slim horizontal bar, used in the compact cycles table on the overview. */
export function ProgressBar({ done, total }: { done: number; total: number }) {
  const safeTotal = total > 0 ? total : 1;
  const pct = Math.min(100, Math.max(0, Math.round((done / safeTotal) * 100)));

  return (
    <div className="flex items-center gap-2.5" title={`${done} of ${total} sessions this cycle`}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Sessions completed this cycle"
        className="h-1.5 w-20 overflow-hidden rounded-full bg-[#e9e3f6]"
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[13px] tabular-nums text-admin-muted">
        {done}/{total}
      </span>
    </div>
  );
}

/** Small ring + "X / Y" label, used in the full ongoing-cycles table. */
export function ProgressRing({ done, total }: { done: number; total: number }) {
  const safeTotal = total > 0 ? total : 1;
  const ratio = Math.min(1, Math.max(0, done / safeTotal));
  const radius = 14;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex items-center gap-2" title={`${done} of ${total} sessions this cycle`}>
      <svg width="36" height="36" viewBox="0 0 36 36" role="img" aria-label="Cycle progress" className="shrink-0">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="#e9e3f6" strokeWidth="5" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="#7e2bf1"
          strokeWidth="5"
          strokeDasharray={`${(circumference * ratio).toFixed(2)} ${circumference.toFixed(2)}`}
          transform="rotate(-90 18 18)"
        />
      </svg>
      <span className="text-[13px] tabular-nums">
        {done} / {total}
      </span>
    </div>
  );
}
