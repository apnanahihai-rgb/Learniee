"use client";

import Link from "next/link";
import { Lock, Video } from "lucide-react";

import DemoJoinButton from "@/features/shared/components/DemoJoinButton";
import {
  dayLabel,
  formatTime,
  initialOf,
  JOIN_OPENS_MINUTES,
  kidColor,
  kidFirstName,
} from "@/features/parent/components/dashboard/dashboardUtils";
import type {
  DashboardDemo,
  DashboardKid,
  DashboardSession,
} from "@/features/parent/types/dashboard";

interface Props {
  kids: DashboardKid[];
  session: DashboardSession | null;
  demo: DashboardDemo | null;
  nowMs: number;
  skewMs: number;
  meetEnabled: boolean;
}

/**
 * "Up next": the soonest class or demo. Turns solid purple with a Join
 * button once the join window opens (10 minutes before a class; the server's
 * demo window for a demo), otherwise stays calm with a countdown.
 */
export default function UpNextHero({ kids, session, demo, nowMs, skewMs, meetEnabled }: Props) {
  const now = new Date(nowMs);
  const sessionAt = session ? new Date(session.startsAt).getTime() : Infinity;
  const demoAt = demo ? new Date(demo.startsAt).getTime() : Infinity;
  const isDemo = demoAt < sessionAt;
  const item = isDemo ? demo : session;

  if (!item) {
    return (
      <section
        aria-label="Up next"
        className="flex flex-col items-start gap-4 rounded-[20px] border border-[#ebe8f3] bg-white p-6"
      >
        <h2 className="font-heading text-xl font-semibold text-[#1f1a30]">No classes coming up</h2>
        <p className="text-sm text-[#55516e]">
          Browse courses and book a free demo to meet a teacher.
        </p>
        <Link
          href="/parent/courses"
          className="inline-flex h-11 items-center rounded-full bg-brand px-6 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Find a course
        </Link>
      </section>
    );
  }

  const start = new Date(item.startsAt);
  const msLeft = start.getTime() - nowMs;
  const minsLeft = Math.ceil(msLeft / 60_000);
  const open = isDemo
    ? demo?.joinWindow.opensAt
      ? nowMs >= new Date(demo.joinWindow.opensAt).getTime()
      : false
    : msLeft <= JOIN_OPENS_MINUTES * 60_000;
  const inProgress = msLeft <= 0;

  let countdown: string;

  if (inProgress) {
    countdown = "In progress";
  } else if (open) {
    countdown = `Starts in ${minsLeft} min`;
  } else if (start.toDateString() === now.toDateString()) {
    const h = Math.floor(minsLeft / 60);
    const m = minsLeft % 60;

    countdown = `Starts in ${h ? `${h}h ` : ""}${m}m`;
  } else {
    countdown = `${dayLabel(start, now)} · ${formatTime(start)}`;
  }

  const [time, meridiem] = formatTime(start).split(" ");
  const studentId = item.studentId;
  const kidName = kidFirstName(kids, studentId);
  const color = kidColor(kids, studentId);

  const solid = open;
  const shell = solid
    ? "bg-brand text-white"
    : "border border-[#ebe8f3] bg-white text-[#1c1833] shadow-sm";

  return (
    <section
      aria-label="Up next"
      className={`relative flex flex-col gap-5 overflow-hidden rounded-[20px] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7 ${shell}`}
    >
      <div className="min-w-0 flex-1">
        <p
          className={`flex items-center gap-2 text-sm font-bold ${solid ? "text-white/90" : "text-[#55516e]"}`}
        >
          <span
            className={`size-2 rounded-full ${solid ? "bg-brand-yellow" : "bg-brand"}`}
            aria-hidden
          />
          Up next{isDemo ? " · Demo" : ""}
        </p>

        <div className="mt-3 flex min-w-0 items-center gap-4">
          <div
            className={`whitespace-nowrap font-heading text-5xl font-semibold leading-none ${solid ? "" : "text-[#5b1fb0]"}`}
          >
            {time}
            <small className="mt-1 block text-xs font-semibold opacity-80">{meridiem}</small>
          </div>
          <span className={`w-px self-stretch ${solid ? "bg-white/30" : "bg-[#ddd8ea]"}`} />
          <div className="min-w-0">
            <h2
              className={`font-heading text-[22px] font-semibold leading-snug ${solid ? "" : "text-[#1f1a30]"}`}
            >
              {item.title}
            </h2>
            <p className="mt-0.5 flex items-center gap-2 text-sm opacity-90">
              <span
                className={`grid size-5 place-items-center rounded-full text-[10px] font-semibold ${solid ? "bg-white/25 text-white" : "bg-[#ece1fe] text-[#5b1fb0]"}`}
                style={solid ? undefined : { color }}
              >
                {initialOf(kidName)}
              </span>
              {item.teacherName} · {kidName}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:items-end">
        <p className={`font-semibold ${solid ? "text-lg" : "text-base text-[#5b1fb0]"}`}>
          {countdown}
        </p>

        {open && !isDemo && session && (
          <Link
            href={`/parent/classes/${session.id}/join`}
            className={`inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-yellow px-6 text-[15px] font-bold text-[#2a1b00] transition hover:brightness-95 ${inProgress ? "ring-4 ring-brand-yellow/40" : ""}`}
          >
            <Video size={20} />
            Join session
          </Link>
        )}

        {open && isDemo && demo && (
          <div className="rounded-full bg-white p-1">
            <DemoJoinButton
              role="parent"
              bookingId={demo.id}
              status="CONFIRMED"
              joinWindow={demo.joinWindow}
              meetEnabled={meetEnabled}
              skewMs={skewMs}
              copyText={kidName}
            />
          </div>
        )}

        {!open && (
          <>
            <Link
              href={isDemo ? "/parent/free-demo" : `/parent/my-classes/${(session as DashboardSession).enrollmentId}`}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-brand hover:bg-[#f6f1ff]"
            >
              {isDemo ? "View demos" : "View class"}
            </Link>
            <p className="flex items-center gap-1.5 text-xs font-bold text-[#7d7998]">
              <Lock size={12} />
              Opens {JOIN_OPENS_MINUTES} minutes before {isDemo ? "the demo" : "class"}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
