import Link from "next/link";

import { BTN_TXT } from "@/features/parent/components/home/HomeBits";
import { fmtTime } from "@/features/parent/components/home/homeLogic";
import WeekAgendaGrid, { groupByDay } from "@/features/shared/components/home/WeekAgendaGrid";
import type { TeacherHomeSession } from "@/features/teacher/types/home";

import { isSessionUpcoming, studentColor } from "./teacherHomeLogic";

export default function TeacherWeekAgenda({
  sessions,
  studentNames,
  now,
}: {
  sessions: TeacherHomeSession[];
  studentNames: string[];
  now: Date;
}) {
  const upcoming = sessions.filter((s) => isSessionUpcoming(s, now));

  return (
    <WeekAgendaGrid
      now={now}
      action={
        <Link href="/teacher/calendar?tab=schedule" className={BTN_TXT}>
          Calendar
        </Link>
      }
      chipsFor={(day) =>
        groupByDay(upcoming, (s) => s.start, day).map((s) => ({
          key: s.id,
          href: "/teacher/calendar",
          color: studentColor(studentNames, s.studentName),
          time: fmtTime(s.start),
          label: `${s.studentName.split(" ")[0]} · ${s.kind === "demo" ? "demo" : s.subject || "class"}`,
          ariaLabel: `${s.title}, ${fmtTime(s.start)}`,
        }))
      }
    />
  );
}
