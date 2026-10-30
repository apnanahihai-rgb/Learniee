"use client";

import Link from "next/link";
import { Video } from "lucide-react";

import DemoJoinButton from "@/features/shared/components/DemoJoinButton";
import {
  dayLabel,
  formatTime,
  kidFirstName,
} from "@/features/parent/components/dashboard/dashboardUtils";
import type { DashboardDemo, DashboardKid } from "@/features/parent/types/dashboard";

interface Props {
  kids: DashboardKid[];
  demo: DashboardDemo;
  moreCount: number;
  nowMs: number;
  skewMs: number;
  meetEnabled: boolean;
}

/** A slim row for an upcoming demo when the hero above is showing something sooner. */
export default function DemoStrip({ kids, demo, moreCount, nowMs, skewMs, meetEnabled }: Props) {
  const start = new Date(demo.startsAt);
  const now = new Date(nowMs);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#ebe8f3] bg-white p-3 pl-4">
      <Link href="/parent/free-demo" className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#f6f1ff] text-brand">
          <Video size={18} />
        </span>
        <span className="min-w-0">
          <b className="block truncate text-sm font-semibold text-[#1c1833]">Demo: {demo.title}</b>
          <small className="block truncate text-[13px] text-[#7d7998]">
            {kidFirstName(kids, demo.studentId)} · {dayLabel(start, now)}, {formatTime(start)}
            {moreCount > 0 ? ` · +${moreCount} more` : ""}
          </small>
        </span>
      </Link>

      <DemoJoinButton
        role="parent"
        bookingId={demo.id}
        status="CONFIRMED"
        joinWindow={demo.joinWindow}
        meetEnabled={meetEnabled}
        skewMs={skewMs}
        copyText={kidFirstName(kids, demo.studentId)}
        className="shrink-0"
      />
    </div>
  );
}
