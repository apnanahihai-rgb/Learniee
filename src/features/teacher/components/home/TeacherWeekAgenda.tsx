import Link from "next/link";

import { BTN_TXT, Section, kcStyle } from "@/features/parent/components/home/HomeBits";
import { dayKey, fmtTime } from "@/features/parent/components/home/homeLogic";

import { isSessionUpcoming, studentColor } from "./teacherHomeLogic";
import type { TeacherHomeSession } from "./teacherHomeTypes";

export default function TeacherWeekAgenda({
  sessions,
  studentNames,
  now,
}: {
  sessions: TeacherHomeSession[];
  studentNames: string[];
  now: Date;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <Section
      id="home-week"
      title="This week"
      action={
        <Link href="/teacher/calendar?tab=schedule" className={BTN_TXT}>
          Calendar
        </Link>
      }
    >
      <div className="overflow-hidden rounded-[14px] border border-pd-line bg-white">
        {days.map((d, i) => {
          const day = sessions
            .filter((s) => isSessionUpcoming(s, now) && dayKey(s.start) === dayKey(d))
            .sort((a, b) => a.start.getTime() - b.start.getTime());
          const today = i === 0;
          const free = day.length === 0;

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
                  day.map((s) => (
                    <Link
                      key={s.id}
                      href="/teacher/calendar"
                      style={kcStyle(studentColor(studentNames, s.studentName))}
                      aria-label={`${s.title}, ${fmtTime(s.start)}`}
                      className="inline-flex max-w-full items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--kc)_22%,#fff)] bg-[color-mix(in_srgb,var(--kc)_10%,#fff)] py-1.5 pl-2.5 pr-3 text-left text-[13px] leading-[1.3] hover:border-(--kc) max-[420px]:py-[5px] max-[420px]:pl-2 max-[420px]:pr-2.5 max-[420px]:text-[12.5px]"
                    >
                      <span className="size-2 shrink-0 rounded-full bg-(--kc)" />
                      <i className="whitespace-nowrap font-bold not-italic text-(--kc)">{fmtTime(s.start)}</i>
                      <span className="truncate whitespace-nowrap text-pd-ink2">
                        {s.studentName.split(" ")[0]} · {s.kind === "demo" ? "demo" : s.subject || "class"}
                      </span>
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
