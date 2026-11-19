"use client";

import Link from "next/link";
import { Plus, RotateCw, TriangleAlert } from "lucide-react";

import AttentionList from "@/features/parent/components/home/AttentionList";
import { BTN_PRI } from "@/features/parent/components/home/HomeBits";
import { SetupProgressCard } from "@/features/parent/components/home/SetupCard";
import { dayDiff, greetingFor } from "@/features/parent/components/home/homeLogic";
import { useServerNow } from "@/features/shared/hooks/useServerNow";
import { useTeacherHome } from "@/features/teacher/hooks/useTeacherHome";

import TeacherCourseTiles from "./TeacherCourseTiles";
import TeacherDemoStrip from "./TeacherDemoStrip";
import TeacherEarningsCard from "./TeacherEarningsCard";
import TeacherUpNextHero from "./TeacherUpNextHero";
import TeacherWeekAgenda from "./TeacherWeekAgenda";
import { isSessionUpcoming } from "./teacherHomeLogic";

const PAGE = "mx-auto max-w-[1160px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8";

function HomeSkeleton() {
  const bar = (h: number, w = "100%", r = 14) => (
    <div className="animate-pulse bg-[#eeeaf7]" style={{ height: h, width: w, borderRadius: r }} />
  );
  return (
    <div aria-busy="true" aria-label="Loading">
      {bar(34, "50%", 10)}
      <div className="h-6" />
      <div className="grid grid-cols-1 gap-6 min-[1180px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          {bar(150, "100%", 20)}
          {bar(180)}
          {bar(220)}
        </div>
        <div className="flex flex-col gap-6">
          {bar(180)}
          {bar(140)}
        </div>
      </div>
    </div>
  );
}

export default function TeacherHomeScreen() {
  const { data, hasData, loading, error, skewMs, reload } = useTeacherHome();

  // Time-dependent UI renders only after mount; follows the server clock.
  const now = useServerNow(skewMs);

  // Only a failed first load is an error screen — a failed background refresh keeps the last data.
  if (error && !hasData && !loading) {
    return (
      <div className={PAGE}>
        <div className="rounded-2xl border border-pd-line bg-white p-5">
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <span className="grid size-14 place-items-center rounded-xl bg-pd-red-bg text-pd-red">
              <TriangleAlert size={26} />
            </span>
            <h3 className="font-heading text-lg font-semibold text-pd-ink">Something went wrong</h3>
            <p className="max-w-[360px] text-sm text-pd-ink3">
              We couldn’t load your dashboard. Check your connection and try again.
            </p>
            <button type="button" onClick={reload} className={`${BTN_PRI} !h-[42px] !px-4 !text-sm`}>
              <RotateCw size={16} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !now) {
    return (
      <div className={PAGE}>
        <HomeSkeleton />
      </div>
    );
  }

  const upcoming = data.sessions.filter((s) => isSessionUpcoming(s, now));
  const hero = upcoming[0];
  const todayCount = upcoming.filter((s) => dayDiff(s.start, now) === 0).length;

  const greeting = greetingFor(now);

  return (
    <div className={PAGE}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-[26px] font-semibold leading-[1.15] text-pd-ink outline-none sm:text-[32px]">
            {greeting}
            {data.firstName ? (
              <>
                , <span className="text-pd-brand">{data.firstName}</span>
              </>
            ) : null}
          </h1>
          <p className="text-sm text-pd-ink3">
            {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        <Link href="/teacher/course-management/new" className={`${BTN_PRI} !h-[42px] !px-4 !text-sm`}>
          <Plus size={16} />
          Create course
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {[
          { n: todayCount, l: "today" },
          { n: data.activeStudentCount, l: "active students" },
          { n: data.reviewCount, l: "to review" },
        ].map((s) => (
          <span
            key={s.l}
            className="rounded-full border border-pd-line bg-white/80 px-3 py-1.5 text-[13px] text-pd-ink2"
          >
            <b className="mr-1 font-semibold text-pd-ink">{s.n}</b>
            {s.l}
          </span>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 min-[1180px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div>
            <TeacherUpNextHero
              session={hero}
              meetEnabled={data.meetEnabled}
              skewMs={skewMs}
              now={now}
            />
            <TeacherDemoStrip
              sessions={data.sessions}
              heroSession={hero}
              meetEnabled={data.meetEnabled}
              skewMs={skewMs}
              now={now}
            />
          </div>
          <AttentionList items={data.attention} />
          <TeacherWeekAgenda sessions={data.sessions} studentNames={data.studentNames} now={now} />
          <TeacherCourseTiles courses={data.courses} sessions={data.sessions} now={now} />
        </div>

        <div className="flex min-w-0 flex-col gap-6 min-[1180px]:sticky min-[1180px]:top-[80px]">
          <TeacherEarningsCard earnings={data.earnings} studentNames={data.studentNames} />
          {data.setup && <SetupProgressCard {...data.setup} />}
        </div>
      </div>
    </div>
  );
}
