"use client";

import Link from "next/link";

import {
  dayDiff,
  dayLabel,
  initialOf,
  kidColor,
} from "@/features/parent/components/dashboard/dashboardUtils";
import type {
  DashboardClass,
  DashboardHomework,
  DashboardKid,
} from "@/features/parent/types/dashboard";

interface Props {
  kids: DashboardKid[];
  classes: DashboardClass[];
  homework: DashboardHomework[];
  now: Date;
}

/** "How Aarav is doing": per-child progress bars plus the homework still due. */
export default function KidProgressCards({ kids, classes, homework, now }: Props) {
  if (kids.length === 0) return null;

  const one = kids.length === 1;

  return (
    <section aria-labelledby="dash-kids">
      <h2 id="dash-kids" className="mb-3 font-heading text-lg font-semibold">
        How {one ? `${kids[0].name} is` : "they’re"} doing
      </h2>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
        {kids.map((kid) => {
          const color = kidColor(kids, kid.id);
          const enrolled = classes.filter((c) => c.studentId === kid.id && c.status === "enrolled");
          const due = homework
            .filter((h) => h.studentId === kid.id)
            .sort(
              (a, b) =>
                (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) -
                (b.dueDate ? new Date(b.dueDate).getTime() : Infinity),
            );
          const late = due.filter((h) => h.dueDate && dayDiff(new Date(h.dueDate), now) < 0).length;
          const shown = due.slice(0, one ? 4 : 2);

          return (
            <div
              key={kid.id}
              className="flex min-w-0 flex-col gap-2.5 rounded-[14px] border border-[#ebe8f3] border-t-[3px] bg-white p-4"
              style={{ borderTopColor: color }}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="grid size-8 place-items-center rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: color }}
                >
                  {initialOf(kid.name)}
                </span>
                <div className="min-w-[130px] flex-1">
                  <b className="block font-heading text-[17px] font-bold">{kid.name}</b>
                  <small className="whitespace-nowrap text-[13px] text-[#7d7998]">
                    {kid.grade !== null ? `Gr ${kid.grade} · ` : ""}
                    {enrolled.length} class{enrolled.length === 1 ? "" : "es"}
                  </small>
                </div>
                <span
                  className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    due.length === 0
                      ? "bg-[#e6f6ec] text-[#15803d]"
                      : late > 0
                        ? "bg-[#fee2e2] text-[#dc2626]"
                        : "bg-[#f6f5fa] text-[#55516e]"
                  }`}
                >
                  {due.length ? `${due.length} homework due` : "Homework done"}
                </span>
              </div>

              {one &&
                enrolled.map((c) => (
                  <div
                    key={c.id}
                    className="grid grid-cols-[96px_1fr_40px] items-center gap-2.5 text-[13px] text-[#55516e]"
                  >
                    <span className="truncate">{c.subject || c.title}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-[#ece1fe]">
                      <i
                        className="block h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${c.total > 0 ? Math.min(100, Math.round((c.done / c.total) * 100)) : 0}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <small className="text-right text-[#7d7998]">
                      {c.done}/{c.total}
                    </small>
                  </div>
                ))}

              {shown.map((h) => (
                <Link
                  key={h.id}
                  href={`/parent/my-classes/${h.enrollmentId}?tab=homework`}
                  className="flex min-w-0 flex-col items-start rounded-[10px] bg-[#f8f7fc] px-3 py-2.5 text-left text-sm font-medium hover:bg-[#f1edfb]"
                >
                  <span className="w-full truncate">{h.title}</span>
                  <small className="text-[#7d7998]">
                    {h.subject ? `${h.subject} · ` : ""}
                    {h.dueDate
                      ? dayDiff(new Date(h.dueDate), now) < 0
                        ? "Overdue"
                        : dayLabel(new Date(h.dueDate), now)
                      : "No due date"}
                  </small>
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
