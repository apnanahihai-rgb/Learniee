"use client";

import Link from "next/link";
import { Lock, Video } from "lucide-react";

import DemoJoinButton from "@/features/shared/components/DemoJoinButton";
import { BTN_PRI } from "@/features/parent/components/home/HomeBits";
import { countdown, whenLabel } from "@/features/parent/components/home/homeLogic";

import { isSessionUpcoming } from "./teacherHomeLogic";
import type { TeacherHomeSession } from "./teacherHomeTypes";

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
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-pd-line bg-white px-3.5 py-2.5 transition-colors hover:border-pd-line2">
      <Link
        href="/teacher/requests?tab=demos"
        aria-label="Open demos"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-pd-b50 text-pd-brand">
          <Video size={18} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <b className="truncate text-sm font-medium">{next.title}</b>
          <small className="truncate text-xs font-bold text-pd-ink2">
            for {next.studentName} · {cd.open ? cd.text : whenLabel(next.start, now)}
          </small>
        </span>
      </Link>

      {cd.open && next.demo ? (
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
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Opens 10 minutes before the demo"
          className={`${BTN_PRI} shrink-0 !bg-pd-b100 !text-pd-brand-d !opacity-75`}
        >
          <Lock size={14} />
          Start demo
        </button>
      )}
    </div>
  );
}
