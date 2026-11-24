"use client";

import { ChevronRight } from "lucide-react";
import { useState, type KeyboardEvent, type ReactNode } from "react";

import { adminTag, cx, ADMIN_CARD, ADMIN_FOCUS } from "@/features/admin/components/ui/adminStyles";
import { AdminEmptyState, AdminSearchBox } from "@/features/admin/components/ui/design";

/**
 * Review-queue building blocks from the Admin HTML designs (Nov 2026):
 * a list of collapsible review cards with a "N waiting" bar, filter chips,
 * search and sort. Used by every approval-style screen (courses first).
 */

/* ------------------------------ Review card ------------------------------ */

export function AdminReviewCard({
  id,
  open,
  onToggle,
  lead,
  title,
  meta,
  keyLabel,
  keyValue,
  tags,
  children,
  footer,
}: {
  id: string;
  open: boolean;
  onToggle: () => void;
  lead?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  keyLabel?: string;
  keyValue?: ReactNode;
  tags?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    }
  }

  return (
    <article
      className={cx(
        ADMIN_CARD,
        "flex flex-col overflow-hidden transition-opacity",
        open && "border-pd-line2 shadow-[0_6px_20px_-12px_rgba(70,37,127,0.35)]",
      )}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={`${id}-body`}
        onClick={onToggle}
        onKeyDown={onKeyDown}
        className={cx(
          "relative flex cursor-pointer items-center gap-3.5 py-[18px] pl-5 pr-12 transition-colors hover:bg-[#faf9fe] max-[719px]:flex-wrap",
          open ? "border-b border-pd-line bg-pd-b50" : "",
          ADMIN_FOCUS,
        )}
      >
        {lead}
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-[18px] font-semibold leading-tight text-balance">{title}</h2>
          {meta && <p className="mt-0.5 break-words text-[13px] text-pd-ink3">{meta}</p>}
        </div>
        {keyValue != null && (
          <div className="shrink-0 text-right max-[719px]:text-left">
            <small className="block text-[11px] font-semibold text-pd-ink3">{keyLabel}</small>
            <b className="font-heading text-base font-semibold leading-snug text-pd-brand-d">{keyValue}</b>
          </div>
        )}
        {tags && (
          <div className="flex max-w-1/2 shrink-0 flex-wrap justify-end gap-1.5 max-[719px]:max-w-none max-[719px]:justify-start">
            {tags}
          </div>
        )}
        <ChevronRight
          size={20}
          aria-hidden="true"
          className={cx(
            "absolute right-4 top-1/2 -mt-2.5 text-pd-ink3 transition-transform duration-200",
            open && "rotate-90 text-pd-brand",
          )}
        />
      </div>

      {open && (
        <div id={`${id}-body`}>
          {children && <div className="flex flex-col gap-5 p-5">{children}</div>}
          {footer && (
            <footer className="flex flex-wrap items-start gap-x-4 gap-y-3 border-t border-pd-line bg-pd-bg px-5 py-3.5">
              {footer}
            </footer>
          )}
        </div>
      )}
    </article>
  );
}

/** Decision buttons, pushed to the right of the card footer (full width on phones). */
export function AdminDecisionBar({ children }: { children: ReactNode }) {
  return (
    <div className="ml-auto flex flex-wrap gap-2 max-[719px]:ml-0 max-[719px]:w-full max-[719px]:[&>*]:flex-1">
      {children}
    </div>
  );
}

/* ------------------------------ Card content ------------------------------ */

/** Label/value grid. `highlight` = big brand value, `wide` = two columns. */
export function AdminProps({
  items,
}: {
  items: Array<{ label: string; value: ReactNode; highlight?: boolean; wide?: boolean }>;
}) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-6 gap-y-4">
      {items.map((item) => (
        <div key={item.label} className={item.wide ? "col-span-2 max-[719px]:col-span-1" : undefined}>
          <dt className="text-xs font-semibold text-pd-ink3">{item.label}</dt>
          <dd
            className={cx(
              "mt-0.5 break-words",
              item.highlight
                ? "font-heading text-[18px] font-semibold leading-snug text-pd-brand-d"
                : "text-[14px] font-semibold",
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Small uppercase heading with content under it. */
export function AdminGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <h3 className="text-xs font-bold uppercase tracking-[0.04em] text-pd-ink3">{title}</h3>
      {children}
    </div>
  );
}

export function AdminText({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AdminGroup title={title}>
      <p className="text-[14px] text-pd-ink2">{children}</p>
    </AdminGroup>
  );
}

/** Quoted words (a parent's report, a teacher's summary) with the design's violet left rule. */
export function AdminQuote({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AdminGroup title={title}>
      <p className="whitespace-pre-wrap border-l-[3px] border-pd-b100 py-0.5 pl-3.5 text-[14px] text-pd-ink2">
        {children}
      </p>
    </AdminGroup>
  );
}

export function AdminTwoCols({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 md:grid-cols-2">{children}</div>;
}

/** Highlighted notice inside a card ("Non-standard price"). */
export function AdminGoldNote({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="note" className="rounded-xl border border-[#efd694] bg-pd-amber-bg px-3.5 py-3">
      <small className="mb-0.5 block text-xs font-semibold text-pd-ink3">{title}</small>
      <span className="text-[14px]">{children}</span>
    </div>
  );
}

/* ---------------------------------- Queue --------------------------------- */

export interface AdminQueueItem {
  id: string;
  /** Chip filter value (e.g. the subject). */
  group?: string | null;
  /** ISO date the item started waiting; drives the "Waiting N days" tag and sorting. */
  date?: string | null;
  /** Number used for "Highest amount" sorting and the summed total. */
  amount?: number;
  /** Text the search box matches against. */
  searchText: string;
  /** Renders the card; the queue passes the open state and toggle. */
  render: (ctx: { open: boolean; onToggle: () => void; waitingTag: ReactNode }) => ReactNode;
}

type SortMode = "old" | "new" | "amt";

const DAY_MS = 86_400_000;

function waitingDays(date: string | null | undefined, now: number): number | null {
  if (!date) return null;

  const time = new Date(date).getTime();

  return Number.isNaN(time) ? null : Math.max(0, Math.floor((now - time) / DAY_MS));
}

function waitingTag(days: number | null): ReactNode {
  if (days == null) return null;

  const color = days >= 7 ? "red" : days >= 3 ? "amber" : "gray";

  return (
    <span className={adminTag(color)}>
      {days === 0 ? "New today" : `Waiting ${days} ${days === 1 ? "day" : "days"}`}
    </span>
  );
}

export function AdminQueue({
  items,
  searchPlaceholder = "Filter this list",
  amountLabel = "Amount",
  emptyMessage = "Nothing matches your filter.",
  countLabel = "waiting",
  showWaiting = true,
}: {
  items: AdminQueueItem[];
  searchPlaceholder?: string;
  amountLabel?: string;
  emptyMessage?: string;
  /** Word after the count pill ("5 waiting", "12 decided"). */
  countLabel?: string;
  /** False for finished lists: no "Waiting N days" tag or oldest-waiting summary (dates still sort). */
  showWaiting?: boolean;
}) {
  const [now] = useState(() => Date.now());
  const [search, setSearch] = useState("");
  const [chip, setChip] = useState("");
  const [sort, setSort] = useState<SortMode>("old");
  // undefined = first visible card open; null = Admin closed everything.
  const [openId, setOpenId] = useState<string | null | undefined>(undefined);

  const hasAmount = items.some((item) => item.amount != null);

  const groups = new Map<string, number>();
  for (const item of items) {
    if (item.group) groups.set(item.group, (groups.get(item.group) ?? 0) + 1);
  }
  const activeChip = groups.has(chip) ? chip : "";

  const query = search.trim().toLowerCase();
  const visible = items
    .filter(
      (item) =>
        (!activeChip || item.group === activeChip) &&
        (!query || item.searchText.toLowerCase().includes(query)),
    )
    .sort((a, b) => {
      if (sort === "amt") return (b.amount ?? 0) - (a.amount ?? 0);

      const diff = (a.date ?? "").localeCompare(b.date ?? "");

      return sort === "new" ? -diff : diff;
    });

  const effectiveOpen =
    openId === null ? null : visible.some((item) => item.id === openId) ? openId! : visible[0]?.id ?? null;

  const ages = showWaiting
    ? items.map((item) => waitingDays(item.date, now)).filter((d): d is number => d != null)
    : [];
  const total = items.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const summary = [
    ages.length ? `Oldest waiting ${Math.max(...ages)} days` : "",
    hasAmount ? `${amountLabel}: ₹${total.toLocaleString("en-IN")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const showTools = items.length > 1;

  return (
    <div className="flex flex-col gap-3.5">
      {showTools && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <b className="rounded-full bg-pd-amber-bg px-3 py-1 text-[13px] font-bold text-pd-amber">
                {items.length} {countLabel}
              </b>
              {summary && <span className="text-[13px] text-pd-ink3">{summary}</span>}
            </div>
            <div className="max-w-[340px] flex-[1_1_280px] [&>div]:max-w-none">
              <AdminSearchBox value={search} onChange={setSearch} placeholder={searchPlaceholder} />
            </div>
          </div>

          <div
            className={cx(
              "flex flex-wrap items-center gap-3",
              groups.size > 1 ? "justify-between" : "justify-end",
            )}
          >
            {groups.size > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {[["", `All ${items.length}`], ...[...groups].map(([key, n]) => [key, `${key} ${n}`])].map(
                  ([key, label]) => (
                    <button
                      key={key || "all"}
                      type="button"
                      onClick={() => setChip(key)}
                      className={cx(
                        "h-8 rounded-full border px-3 text-[13px] font-semibold transition-colors",
                        activeChip === key
                          ? "border-pd-brand bg-pd-brand text-white"
                          : "border-pd-line2 bg-white text-pd-ink2 hover:border-pd-brand",
                        ADMIN_FOCUS,
                      )}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            )}
            <label className="flex items-center gap-2 text-[13px] font-semibold text-pd-ink3">
              Sort
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortMode)}
                className="h-[34px] rounded-[10px] border border-pd-line2 bg-white px-2.5 font-normal text-pd-ink"
              >
                <option value="old">Oldest first</option>
                <option value="new">Newest first</option>
                {hasAmount && <option value="amt">Highest amount</option>}
              </select>
            </label>
          </div>
        </>
      )}

      {visible.length === 0 ? (
        <AdminEmptyState message={emptyMessage} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {visible.map((item) => (
            <div key={item.id}>
              {item.render({
                open: effectiveOpen === item.id,
                onToggle: () => setOpenId(effectiveOpen === item.id ? null : item.id),
                waitingTag: showWaiting ? waitingTag(waitingDays(item.date, now)) : null,
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
