import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { ReactNode } from "react";

import { ADMIN_CARD_FLUSH, ADMIN_FOCUS, adminBtn, cx } from "@/features/admin/components/ui/adminStyles";
import { getInitials } from "@/lib/initials";

/**
 * Shared building blocks for the redesigned Admin screens (HTML designs,
 * Nov 2026). Colours are the `pd-*` tokens in globals.css. Server-safe
 * (no hooks): pages pass state and handlers in as props.
 */

/* ------------------------------- Page header ------------------------------ */

export interface AdminCrumb {
  label: string;
  href?: string;
}

/** Breadcrumb, title and one-line description, with optional actions on the right. */
export function AdminHead({
  crumbs,
  title,
  description,
  actions,
}: {
  crumbs?: AdminCrumb[];
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="mb-1 flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-pd-ink3"
          >
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1.5">
                {index > 0 && <ChevronRight size={12} aria-hidden="true" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="text-pd-brand hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="font-heading text-[28px] font-semibold leading-tight text-balance outline-none sm:text-[32px]">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 max-w-[62ch] text-[14px] text-pd-ink3">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Page column: 24px between blocks, like the design's `.pg > * + *`. */
export function AdminStack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6">{children}</div>;
}

/* ---------------------------------- Stats ---------------------------------- */

/** Row of small number cards (the design's `.stats`): 2 across on phones, 4 from 640px. */
export function AdminStats({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-pd-line bg-white p-4">
          <b className="block font-heading text-[28px] font-semibold leading-tight">{item.value}</b>
          <small className="text-[13px] text-pd-ink3">{item.label}</small>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------- Tabs ---------------------------------- */

/** Pill tab bar with a waiting-count badge on each tab. */
export function AdminPillTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: Array<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex w-max max-w-full gap-0.5 overflow-x-auto rounded-full bg-pd-b50 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => {
        const selected = tab.value === value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={cx(
              "flex h-[38px] shrink-0 items-center gap-1.5 rounded-full px-4 transition-colors",
              selected ? "bg-white font-semibold text-pd-brand-d" : "font-medium text-pd-ink2",
              ADMIN_FOCUS,
            )}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span
                className={cx(
                  "h-[18px] min-w-[18px] rounded-full px-[5px] text-center text-[11px] font-bold leading-[18px]",
                  selected ? "bg-pd-amber-bg text-pd-amber" : "bg-white text-pd-brand-d",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------- Search --------------------------------- */

export function AdminSearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative max-w-[480px] flex-[1_1_280px]">
      <Search
        size={18}
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-3 text-pd-ink3"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-[10px] border border-pd-line bg-white pl-[42px] pr-4 outline-none placeholder:text-pd-ink3/70 focus:border-pd-brand focus:ring-4 focus:ring-pd-b100"
      />
    </div>
  );
}

/* -------------------------------- Data table ------------------------------- */

export interface AdminColumn<Row> {
  label: string;
  /** Right-aligned (numbers, the Action column). */
  right?: boolean;
  /** Show this cell as a full-width block on phones, with no label (name, action). */
  block?: boolean;
  /** Stop the cell text wrapping (dates). */
  nowrap?: boolean;
  render: (row: Row) => ReactNode;
}

const PHONE = "max-[719px]";

/**
 * Table card from the design. From 720px up it is a normal table; below
 * that each row becomes a stacked card with the column label in front of
 * each value (the design's `data-l` trick).
 */
export function AdminDataTable<Row>({
  columns,
  rows,
  rowKey,
  wide,
}: {
  columns: Array<AdminColumn<Row>>;
  rows: Row[];
  rowKey: (row: Row) => string;
  /** Many columns: keep the table 1200px wide from 720px up and scroll sideways (the design's `.led`). */
  wide?: boolean;
}) {
  return (
    <div className={cx(ADMIN_CARD_FLUSH, "overflow-x-auto")}>
      <table
        className={cx("w-full border-collapse", wide && "min-[720px]:min-w-[1200px]", `${PHONE}:block`)}
      >
        <thead className={`${PHONE}:hidden`}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={cx(
                  "whitespace-nowrap border-b border-pd-line bg-pd-bg px-4 py-3 text-left text-xs font-semibold text-pd-ink3",
                  column.right && "text-right",
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className={`${PHONE}:block`}>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={cx(
                "border-b border-pd-line last:border-b-0 hover:bg-[#faf9fe]",
                `${PHONE}:block ${PHONE}:px-4 ${PHONE}:py-3`,
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.label}
                  data-label={column.label}
                  className={cx(
                    "px-4 py-3 align-middle",
                    column.right && "text-right",
                    column.nowrap && "whitespace-nowrap",
                    column.block
                      ? `${PHONE}:block ${PHONE}:p-0 ${PHONE}:text-left ${PHONE}:first:pb-1 ${PHONE}:last:pt-2`
                      : `${PHONE}:flex ${PHONE}:justify-between ${PHONE}:gap-4 ${PHONE}:border-0 ${PHONE}:px-0 ${PHONE}:py-1 ${PHONE}:text-right ${PHONE}:before:shrink-0 ${PHONE}:before:pt-0.5 ${PHONE}:before:text-left ${PHONE}:before:text-xs ${PHONE}:before:font-semibold ${PHONE}:before:text-pd-ink3 ${PHONE}:before:content-[attr(data-label)]`,
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Round initials avatar (the design's `.av.sm`), for the lead slot of review cards. */
export function AdminInitials({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-10 shrink-0 place-items-center rounded-full bg-pd-b100 text-sm font-bold text-pd-brand-d"
    >
      {getInitials(name, "?")}
    </span>
  );
}

/** Avatar + name + one muted line, as used in the first column of tables. */
export function AdminPerson({ name, meta }: { name: string; meta?: string | null }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-pd-b100 text-sm font-bold text-pd-brand-d"
      >
        {getInitials(name, "?")}
      </span>
      <div className="min-w-0">
        <b className="block truncate text-[15px] font-semibold">{name}</b>
        {meta && <small className="block truncate text-[13px] text-pd-ink3">{meta}</small>}
      </div>
    </div>
  );
}

/* ----------------------------- Toolbar / icon cell ------------------------- */

/** Small muted row above a list (the design's `.ctl` + `.sm`): "Newest first" on the left, a count on the right. */
export function AdminListMeta({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-pd-ink3">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}

/** Rounded icon tile + bold title + one muted line (the design's `.who` with `.ico`), for the first column of tables. */
export function AdminIconTitle({
  icon,
  title,
  meta,
}: {
  icon: ReactNode;
  title: string;
  meta?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-pd-b50 text-pd-brand"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <b className="block truncate text-[15px] font-semibold">{title}</b>
        {meta && <small className="block text-[13px] text-pd-ink3">{meta}</small>}
      </div>
    </div>
  );
}

/* ------------------------------ States / notes ----------------------------- */

export function AdminEmptyState({
  title = "All clear",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-pd-line2 bg-white px-4 py-12 text-center">
      <span className="grid size-[52px] place-items-center rounded-[14px] bg-pd-b50 text-pd-brand">
        <CheckCircle2 size={24} aria-hidden="true" />
      </span>
      <h3 className="font-heading text-[19px] font-semibold">{title}</h3>
      <p className="max-w-[38ch] text-pd-ink3">{message}</p>
    </div>
  );
}

export function AdminLoadingState({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-pd-line bg-white px-4 py-12 text-center">
      <p role="status" className="text-pd-ink3">
        {message}
      </p>
    </div>
  );
}

export function AdminErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;

  return (
    <div
      role="alert"
      className="rounded-xl border border-[#efcdca] bg-pd-red-bg px-4 py-3 text-[14px] font-semibold text-pd-red"
    >
      {children}
    </div>
  );
}

/* ---------------------------------- Forms ---------------------------------- */

/**
 * Labelled form field from the design's `.field`. Pass the control
 * (input / select / textarea) as children and give it the same `id`;
 * use `ADMIN_CONTROL` from adminStyles for the control's classes.
 */
export function AdminField({
  id,
  label,
  optional,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-semibold text-pd-ink2">
        {label}
        {optional && <span className="font-normal text-pd-ink3"> (optional)</span>}
      </label>
      {children}
      {hint && <span className="text-xs text-pd-ink3">{hint}</span>}
    </div>
  );
}

/* ------------------------------- Pagination -------------------------------- */

/** Previous / Next with "Page X of Y". Renders nothing for a single page. */
export function AdminPagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (next: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className={adminBtn("out", "sm")}
      >
        <ChevronLeft size={16} aria-hidden="true" />
        Previous
      </button>
      <span className="text-[13px] font-semibold text-pd-ink3">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className={adminBtn("out", "sm")}
      >
        Next
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}
