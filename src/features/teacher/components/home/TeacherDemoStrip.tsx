"use client";

import DemoJoinButton from "@/features/shared/components/DemoJoinButton";
import DemoStripRow, { LockedDemoButton } from "@/features/shared/components/home/DemoStripRow";
import { countdown, whenLabel } from "@/features/parent/components/home/homeLogic";
import type { TeacherHomeSession } from "@/features/teacher/types/home";

import { isSessionUpcoming } from "./teacherHomeLogic";

interface Props {
  sessions: TeacherHomeSession[];
  /** The session already shown in the hero (so we don't repeat it). */
  heroSession: TeacherHomeSession | undefined;
  meetEnabled: boolean;
  skewMs: number;
  now: Date;
}

/** Compact line for the next demo when it isn't the hero. */
export default function TeacherDemoStrip({ sessions, heroSession, meetEnabled, skewMs, now }: Props) {
  const next = sessions
    .filter((s) => s.kind === "demo" && isSessionUpcoming(s, now))
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];

  if (!next || heroSession?.id === next.id) return null;

  const cd = countdown(next.start, now);

  return (
    <DemoStripRow
      href="/teacher/requests?tab=demos"
      title={next.title}
      subtitle={`for ${next.studentName} · ${cd.open ? cd.text : whenLabel(next.start, now)}`}
      action={
        cd.open && next.demo ? (
          <DemoJoinButton
            role="teacher"
            variant="pd"
            bookingId={next.demo.bookingId}
            status="CONFIRMED"
            joinWindow={next.demo.joinWindow}
            meetEnabled={meetEnabled}
            skewMs={skewMs}
            className="shrink-0"
          />
        ) : (
          <LockedDemoButton label="Start demo" />
        )
      }
    />
  );
}
