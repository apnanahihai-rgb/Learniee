"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import AttentionList from "@/features/parent/components/dashboard/AttentionList";
import DashboardHeader, {
  type DashboardLearner,
} from "@/features/parent/components/dashboard/DashboardHeader";
import DemoStrip from "@/features/parent/components/dashboard/DemoStrip";
import KidProgressCards from "@/features/parent/components/dashboard/KidProgressCards";
import MessagesCard from "@/features/parent/components/dashboard/MessagesCard";
import RecommendedCourses from "@/features/parent/components/dashboard/RecommendedCourses";
import SetupCard from "@/features/parent/components/dashboard/SetupCard";
import UpNextHero from "@/features/parent/components/dashboard/UpNextHero";
import WalletRenewalsCard from "@/features/parent/components/dashboard/WalletRenewalsCard";
import WeekAgenda from "@/features/parent/components/dashboard/WeekAgenda";
import {
  JOIN_OPENS_MINUTES,
  useServerNow,
} from "@/features/parent/components/dashboard/dashboardUtils";
import { useDashboard } from "@/features/parent/hooks/useDashboard";
import type { DashboardCourseRec } from "@/features/parent/types/dashboard";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

/** The Parent home screen (Oct 2026 redesign). Data: GET /api/parent/dashboard. */
export default function ParentDashboard() {
  const router = useRouter();
  const { data, loading, error, skewMs } = useDashboard();
  const nowMs = useServerNow(skewMs);
  const now = useMemo(() => new Date(nowMs), [nowMs]);

  const [active, setActive] = useState<DashboardLearner>("all");
  const redirected = useRef(false);

  // A finished demo whose survey was never opened: send the parent there
  // once. Opening the survey stamps it, so this never repeats.
  const surveyId = data?.autoOpenSurveyId ?? null;

  useEffect(() => {
    if (surveyId && !redirected.current) {
      redirected.current = true;
      router.push(`/parent/demo-feedback/${surveyId}`);
    }
  }, [surveyId, router]);

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-[1120px] space-y-4 p-4 sm:p-6 lg:p-8" aria-busy>
        <div className="h-16 w-2/3 animate-pulse rounded-2xl bg-[#f6f1ff]" />
        <div className="h-44 animate-pulse rounded-[20px] bg-[#f6f1ff]" />
        <div className="h-40 animate-pulse rounded-[14px] bg-[#f6f1ff]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[1120px] p-4 sm:p-6 lg:p-8">
        <ErrorBanner>{error || "We couldn't load your dashboard."}</ErrorBanner>
      </div>
    );
  }

  // The learner in view; a child removed elsewhere falls back to "All".
  const learner = data.kids.some((k) => k.id === active) ? active : "all";
  const inView = (studentId: string | null) => learner === "all" || studentId === learner;

  const kids = data.kids.filter((k) => inView(k.id));
  const classes = data.classes.filter((c) => inView(c.studentId));
  const homework = data.homework.filter((h) => inView(h.studentId));
  const chats = data.chats.filter((c) => inView(c.studentId));
  const attention = data.attention.filter((a) => inView(a.studentId));
  const sessions = data.sessions.filter(
    (s) => inView(s.studentId) && new Date(s.endsAt).getTime() > nowMs,
  );
  const demos = data.demos.filter(
    (d) =>
      inView(d.studentId) &&
      (!d.joinWindow.closesAt || new Date(d.joinWindow.closesAt).getTime() > nowMs),
  );

  const nextSession = sessions[0] ?? null;
  const nextDemo = demos[0] ?? null;
  const heroIsDemo =
    !!nextDemo &&
    (!nextSession || new Date(nextDemo.startsAt).getTime() < new Date(nextSession.startsAt).getTime());
  const heroOpen = heroIsDemo
    ? !!nextDemo?.joinWindow.opensAt && nowMs >= new Date(nextDemo.joinWindow.opensAt).getTime()
    : !!nextSession &&
      new Date(nextSession.startsAt).getTime() - nowMs <= JOIN_OPENS_MINUTES * 60_000;

  const todayCount =
    sessions.filter((s) => new Date(s.startsAt).toDateString() === now.toDateString()).length +
    demos.filter((d) => new Date(d.startsAt).toDateString() === now.toDateString()).length;

  const hero = (
    <UpNextHero
      key="hero"
      kids={data.kids}
      session={nextSession}
      demo={nextDemo}
      nowMs={nowMs}
      skewMs={skewMs}
      meetEnabled={data.meetEnabled}
    />
  );
  // The demo gets its own strip only when the hero is showing a class.
  const strip =
    nextDemo && !heroIsDemo ? (
      <DemoStrip
        key="strip"
        kids={data.kids}
        demo={nextDemo}
        moreCount={demos.length - 1}
        nowMs={nowMs}
        skewMs={skewMs}
        meetEnabled={data.meetEnabled}
      />
    ) : null;
  const attentionBlock = <AttentionList key="attention" items={attention} />;

  // Something to act on and nothing starting now: lead with it.
  const attentionFirst = attention.length > 0 && !heroOpen;

  // Recommendations: the screen's three picks, mixed across the children in view.
  const recLists = kids.map((k) => data.recommendations.filter((r) => r.studentId === k.id));
  const recs: DashboardCourseRec[] = [];
  const used = new Set<string>();

  for (let round = 0; recs.length < 3 && round < 8; round++) {
    for (const list of recLists) {
      if (recs.length >= 3) break;

      const pick = list.find((r) => !used.has(r.courseId));

      if (pick) {
        used.add(pick.courseId);
        recs.push(pick);
      }
    }
  }

  return (
    <div className="mx-auto max-w-[1120px] p-4 pb-24 sm:p-6 lg:p-8">
      <DashboardHeader
        firstName={data.parentFirstName}
        kids={data.kids}
        active={learner}
        onSelect={setActive}
        todayCount={todayCount}
        activeClasses={classes.filter((c) => c.status === "enrolled").length}
        homeworkDue={homework.length}
        now={now}
      />

      {error && (
        <div className="mt-4">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      <div className="mt-6 grid gap-6 min-[1180px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          {attentionFirst ? [attentionBlock, hero, strip] : [hero, strip, attentionBlock]}

          <KidProgressCards kids={kids} classes={classes} homework={homework} now={now} />

          <WeekAgenda
            kids={data.kids}
            sessions={sessions}
            demos={demos}
            showLegend={learner === "all" && data.kids.length > 1}
            now={now}
          />

          <RecommendedCourses
            kids={data.kids}
            items={recs}
            heading={kids.length === 1 ? kids[0].name : "your children"}
            showKid={kids.length > 1}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6 min-[1180px]:sticky min-[1180px]:top-24 min-[1180px]:self-start">
          <WalletRenewalsCard
            kids={data.kids}
            classes={classes}
            balance={data.balance}
            freeDemosLeft={data.freeDemosLeft}
          />
          <MessagesCard kids={data.kids} chats={chats} />
          <SetupCard setup={data.setup} />
        </div>
      </div>
    </div>
  );
}
