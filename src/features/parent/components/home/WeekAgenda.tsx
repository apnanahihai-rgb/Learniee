import WeekAgendaGrid, { groupByDay } from "@/features/shared/components/home/WeekAgendaGrid";

import { fmtTime, inKid, kidColor, shortSubject, type LearnerFilter } from "./homeLogic";
import type { HomeData } from "./homeTypes";

export default function WeekAgenda({
  data,
  filter,
  now,
}: {
  data: HomeData;
  filter: LearnerFilter;
  now: Date;
}) {
  const legend =
    filter === "all" ? (
      <div className="flex gap-3.5 text-xs font-medium text-pd-ink3">
        {data.kids.map((k) => (
          <span key={k.id} className="inline-flex items-center gap-1.5">
            <i className="size-2 rounded-full" style={{ background: kidColor(data.kids, k.id) ?? undefined }} />
            {k.first}
          </span>
        ))}
      </div>
    ) : null;

  const visible = data.sessions.filter((s) => inKid(filter, s.kidId));

  return (
    <WeekAgendaGrid
      now={now}
      action={legend}
      chipsFor={(day) =>
        groupByDay(visible, (s) => s.start, day).map((s) => ({
          key: s.id,
          href: "/parent/calendar",
          color: kidColor(data.kids, s.kidId),
          time: fmtTime(s.start),
          label: `${shortSubject(s.subject)}${s.kind === "demo" ? " · demo" : ""}`,
          ariaLabel: `${s.title}, ${fmtTime(s.start)}`,
        }))
      }
    />
  );
}
