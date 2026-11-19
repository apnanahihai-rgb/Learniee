"use client";

import Link from "next/link";
import { Lock, Video } from "lucide-react";

import DemoJoinButton from "@/features/shared/components/DemoJoinButton";
import { BTN_PRI } from "@/features/parent/components/home/HomeBits";
import { countdown, fmtTime } from "@/features/parent/components/home/homeLogic";

import type { TeacherHomeSession } from "@/features/teacher/types/home";

interface Props {
  session: TeacherHomeSession | undefined;
  meetEnabled: boolean;
  skewMs: number;
  now: Date;
}

/** The single focal point on Home: the next class or demo. */
export default function TeacherUpNextHero({ session, meetEnabled, skewMs, now }: Props) {
  if (!session) {
    return (
      <section className="flex flex-col items-start gap-4 rounded-2xl border border-pd-line bg-white p-6 sm:p-[30px]">
        <h2 className="font-heading text-xl font-semibold text-pd-ink">No classes coming up</h2>
        <p className="-mt-2 text-sm text-pd-ink2">Accept a vacancy to get new students.</p>
        <Link href="/teacher/courses?tab=vacancies" className={`${BTN_PRI} !h-[42px] !px-4 !text-sm`}>
          See vacancies
        </Link>
      </section>
    );
  }

  const cd = countdown(session.start, now);
  const isDemo = session.kind === "demo";
  const [time, meridiem] = fmtTime(session.start).split(" ");
  const open = cd.open;

  // Filled brand purple only while Start is open; otherwise a quiet white card.
  const shell = open
    ? "border-pd-brand bg-pd-brand text-white"
    : "border-pd-line bg-white text-pd-ink";

  return (
    <div className="@container">
      <section
        aria-label="Up next"
        data-session={session.id}
        className={`flex flex-row items-center justify-between gap-6 rounded-2xl border p-[30px] @max-[620px]:flex-col @max-[620px]:items-stretch @max-[620px]:gap-5 @max-[620px]:p-6 ${shell}`}
      >
        <div className="min-w-0 flex-1">
          <p className={`flex items-center gap-2 text-sm font-bold ${open ? "opacity-90" : "text-pd-ink2"}`}>
            <span className={`size-2 rounded-full ${open ? "bg-pd-gold" : "bg-pd-brand"}`} />
            Up next{isDemo ? " · Demo" : ""}
          </p>

          <div className="mt-3 flex min-w-0 items-center gap-4">
            <div
              className={`whitespace-nowrap font-heading text-[48px] font-semibold leading-none @max-[620px]:text-4xl ${
                open ? "" : "text-pd-brand-d"
              }`}
            >
              {time}
              <small className="mt-1 block text-xs font-semibold opacity-80">{meridiem}</small>
            </div>
            <span className={`w-px self-stretch ${open ? "bg-white/30" : "bg-pd-line2"}`} />
            <div className="min-w-0">
              <h2 className="font-heading text-[22px] font-semibold leading-tight">{session.title}</h2>
              <p className="mt-0.5 flex items-center gap-2 text-sm opacity-90">
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${
                    open ? "bg-white/25 text-white" : "bg-pd-b100 text-pd-brand-d"
                  }`}
                >
                  {(session.studentName || "?")[0]}
                </span>
                {session.studentName}
              </p>
            </div>
          </div>
        </div>

        <div
          className={`flex shrink-0 flex-col sm:min-w-[200px] sm:items-end @max-[620px]:min-w-0 @max-[620px]:items-stretch ${
            open ? "gap-2" : "gap-1.5"
          }`}
        >
          <p className={`font-bold @max-[620px]:text-sm ${open ? "text-lg" : "text-base text-pd-brand-d"}`}>
            {cd.text}
          </p>

          {open ? (
            isDemo && session.demo ? (
              <DemoJoinButton
                role="teacher"
                variant="hero"
                bookingId={session.demo.bookingId}
                status="CONFIRMED"
                joinWindow={session.demo.joinWindow}
                meetEnabled={meetEnabled}
                skewMs={skewMs}
              />
            ) : (
              <Link
                href={session.href}
                className={`inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-pd-gold px-4 text-[15px] font-bold text-pd-on-gold transition-colors hover:bg-pd-gold-d @max-[620px]:w-full ${
                  cd.live ? "ring-4 ring-pd-gold/40" : ""
                }`}
              >
                <Video size={20} />
                Start session
              </Link>
            )
          ) : (
            <>
              <Link
                href="/teacher/calendar?tab=schedule"
                className="rounded-lg px-0 py-0.5 text-[13px] font-semibold text-pd-brand hover:bg-pd-b50 @max-[620px]:self-start"
              >
                View schedule
              </Link>
              <p className="flex items-center gap-1.5 text-xs font-bold text-pd-ink3 @max-[620px]:justify-center">
                <Lock size={12} />
                Opens 10 minutes before {isDemo ? "the demo" : "class"}
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
