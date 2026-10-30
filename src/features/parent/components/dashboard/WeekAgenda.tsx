"use client";

import Link from "next/link";

import {
  formatTime,
  kidColor,
  shortSubject,
} from "@/features/parent/components/dashboard/dashboardUtils";
import type {
  DashboardDemo,
  DashboardKid,
  DashboardSession,
} from "@/features/parent/types/dashboard";

interface Props {
  kids: DashboardKid[];
  sessions: DashboardSession[];
  demos: DashboardDemo[];
  showLegend: boolean;
  now: Date;
}

interface Entry {
  key: string;
  at: Date;
  studentId: string;
  title: string;
  label: string;
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

/** "This week": the next seven days, one row per day, a coloured chip per class. */
export default function WeekAgenda({ kids, sessions, demos, showLegend, now }: Props) {
  const entries: Entry[] = [
    ...sessions.map((s) => ({
      key: s.id,
      at: new Date(s.startsAt),
      studentId: s.studentId,
      title: s.title,
      label: shortSubject(s.subject || s.title),
    })),
    ...demos.map((d) => ({
      key: `demo-${d.id}`,
      at: new Date(d.startsAt),
      studentId: d.studentId,
      title: d.title,
      label: `${shortSubject(d.subject || d.title)} · demo`,
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);

    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);

    return d;
  });

  return (
    <section aria-labelledby="dash-week">
      <h2 id="dash-week" className="mb-3 flex items-center justify-between gap-3 font-heading text-lg font-semibold">
        This week
        {showLegend && (
          <span className="flex gap-3.5 font-sans text-xs font-medium text-[#7d7998]">
            {kids.map((k) => (
              <span key={k.id} className="inline-flex items-center gap-1.5">
                <i
                  className="size-2 rounded-full"
                  style={{ backgroundColor: kidColor(kids, k.id) }}
                />
                {k.name}
              </span>
            ))}
          </span>
        )}
      </h2>

      <div className="overflow-hidden rounded-[14px] border border-[#ebe8f3] bg-white">
        {days.map((day, i) => {
          const today = i === 0;
          const list = entries.filter((e) => sameDay(e.at, day));
          const free = list.length === 0;

          return (
            <div
              key={day.toISOString()}
              className={`grid grid-cols-[52px_1fr] items-center gap-2 border-t border-[#ebe8f3] px-3 py-2.5 first:border-t-0 sm:grid-cols-[64px_1fr] sm:gap-3 sm:px-4 ${
                today ? "bg-[#f6f1ff]" : ""
              } ${free ? "min-h-11" : "min-h-14"}`}
            >
              <div
                className={`flex leading-tight ${free ? "items-baseline gap-1.5" : "flex-col"} ${
                  today ? "text-[#5b1fb0]" : ""
                }`}
              >
                <small className={`text-xs font-semibold ${today ? "" : "text-[#7d7998]"}`}>
                  {today ? "Today" : day.toLocaleDateString("en-IN", { weekday: "short" })}
                </small>
                <b className={`font-semibold ${free ? "text-[15px]" : "text-lg"} ${today ? "" : "text-[#1c1833]"}`}>
                  {day.getDate()}
                </b>
              </div>

              <div className="flex min-w-0 flex-wrap gap-2">
                {free ? (
                  <span className="text-[13px] text-[#7d7998]/70">No classes</span>
                ) : (
                  list.map((e) => {
                    const color = kidColor(kids, e.studentId);

                    return (
                      <Link
                        key={e.key}
                        href="/parent/calendar"
                        aria-label={`${e.title}, ${formatTime(e.at)}`}
                        className="inline-flex max-w-full items-center gap-2 rounded-full border py-1.5 pl-2.5 pr-3 text-left text-[13px] leading-snug"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${color} 10%, #fff)`,
                          borderColor: `color-mix(in srgb, ${color} 22%, #fff)`,
                        }}
                      >
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <i className="whitespace-nowrap font-bold not-italic" style={{ color }}>
                          {formatTime(e.at)}
                        </i>
                        <span className="truncate text-[#55516e]">{e.label}</span>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
