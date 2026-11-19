import Link from "next/link";

import { Section, kcStyle } from "@/features/parent/components/home/HomeBits";
import { dayKey } from "@/features/parent/components/home/homeLogic";

/** One class / demo pill inside a day of the "This week" list. */
export interface AgendaChip {
  key: string;
  href: string;
  /** Learner colour; null falls back to the brand colour. */
  color: string | null;
  /** Start time, already formatted. */
  time: string;
  label: string;
  ariaLabel: string;
}

/** Today plus the next six days, at local midnight. */
export const weekDays = (now: Date): Date[] =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });

/** Groups items by the local day they start on. */
export function groupByDay<T>(items: T[], startOf: (item: T) => Date, day: Date): T[] {
  return items
    .filter((item) => dayKey(startOf(item)) === dayKey(day))
    .sort((a, b) => startOf(a).getTime() - startOf(b).getTime());
}

/**
 * The "This week" list shared by the Parent and Teacher Home screens: seven
 * day rows, each with a pill per class. The caller decides which pills a day
 * gets (`chipsFor`) and what sits in the section header (`action`).
 */
export default function WeekAgendaGrid({
  now,
  chipsFor,
  action,
}: {
  now: Date;
  chipsFor: (day: Date) => AgendaChip[];
  action?: React.ReactNode;
}) {
  return (
    <Section id="home-week" title="This week" action={action}>
      <div className="overflow-hidden rounded-[14px] border border-pd-line bg-white">
        {weekDays(now).map((d, i) => {
          const chips = chipsFor(d);
          const today = i === 0;
          const free = chips.length === 0;

          return (
            <div
              key={i}
              className={`grid grid-cols-[52px_1fr] items-center gap-2 border-t border-pd-line px-3 py-2.5 first:border-t-0 min-[420px]:grid-cols-[64px_1fr] min-[420px]:gap-3 min-[420px]:px-4 ${
                free ? "min-h-11 !py-1.5" : "min-h-14"
              } ${today ? "bg-pd-b50" : ""}`}
            >
              <div className={`flex leading-[1.15] ${free ? "flex-row items-baseline gap-1.5" : "flex-col"}`}>
                <small className={`text-xs font-semibold ${today ? "text-pd-brand-d" : "text-pd-ink3"}`}>
                  {today ? "Today" : d.toLocaleDateString("en-IN", { weekday: "short" })}
                </small>
                <b
                  className={`font-semibold ${free ? "text-[15px]" : "text-[18px]"} ${
                    today ? "text-pd-brand-d" : free ? "text-pd-ink2" : "text-pd-ink"
                  }`}
                >
                  {d.getDate()}
                </b>
              </div>

              <div className="flex min-w-0 flex-wrap gap-2">
                {free ? (
                  <span className="text-[13px] text-pd-ink3/70">No classes</span>
                ) : (
                  chips.map((c) => (
                    <Link
                      key={c.key}
                      href={c.href}
                      style={kcStyle(c.color)}
                      aria-label={c.ariaLabel}
                      className="inline-flex max-w-full items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--kc)_22%,#fff)] bg-[color-mix(in_srgb,var(--kc)_10%,#fff)] py-1.5 pl-2.5 pr-3 text-left text-[13px] leading-[1.3] hover:border-(--kc) max-[420px]:py-[5px] max-[420px]:pl-2 max-[420px]:pr-2.5 max-[420px]:text-[12.5px]"
                    >
                      <span className="size-2 shrink-0 rounded-full bg-(--kc)" />
                      <i className="whitespace-nowrap font-bold not-italic text-(--kc)">{c.time}</i>
                      <span className="truncate whitespace-nowrap text-pd-ink2">{c.label}</span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
