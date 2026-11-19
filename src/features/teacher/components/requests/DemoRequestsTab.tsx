"use client";

import { Video } from "lucide-react";

import { PdEmpty } from "@/features/parent/components/courses/pdUi";
import DemoJoinButton, {
  liveDemoJoinState,
  useServerClock,
} from "@/features/shared/components/DemoJoinButton";
import { TD_CARD, TD_ROW } from "@/features/teacher/components/my-classes/TeacherUi";
import {
  useTeacherDemoBookings,
  type TeacherDemoBookingListItem,
} from "@/features/teacher/hooks/useDemoBookings";
import { whenFromInstant } from "@/features/teacher/utils/requestTime";
import { RequestsError, RequestsSkeleton } from "./RequestsUi";

function DemoRow({
  b,
  meetEnabled,
  skewMs,
}: {
  b: TeacherDemoBookingListItem;
  meetEnabled: boolean;
  skewMs: number;
}) {
  const nowMs = useServerClock(skewMs);
  const open = liveDemoJoinState(b.joinWindow, nowMs) === "OPEN";
  const child = b.student.visibleName || b.student.firstName;

  return (
    <div className={TD_ROW}>
      <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-pd-b50 text-pd-brand">
        <Video size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <b className="block truncate text-sm font-semibold text-pd-ink">{b.course.courseTitle || "Demo session"}</b>
        <small className="block text-[13px] text-pd-ink3">
          for {child}
          {b.subject ? ` · ${b.subject}` : ""} · {b.scheduledAt ? whenFromInstant(b.scheduledAt) : "Time not set"}
        </small>
      </div>
      <DemoJoinButton
        role="teacher"
        variant="pd"
        bookingId={b.id}
        status={b.status}
        joinWindow={b.joinWindow}
        meetEnabled={meetEnabled}
        skewMs={skewMs}
        copyText={child}
        countdownText={open ? "Open" : undefined}
      />
    </div>
  );
}

/** Requests > Demos: confirmed demos that are coming up (or live right now), each with a Start button. */
export default function DemoRequestsTab() {
  const { bookings, loading, error, reload, meetEnabled, skewMs } = useTeacherDemoBookings();

  if (loading && bookings.length === 0) return <RequestsSkeleton rows={2} height={72} />;
  if (error && bookings.length === 0) return <RequestsError message={error} onRetry={reload} />;

  const now = Date.now() + skewMs;
  const upcoming = bookings
    .filter(
      (b) =>
        b.status === "CONFIRMED" &&
        !!b.scheduledAt &&
        (new Date(b.scheduledAt).getTime() >= now || liveDemoJoinState(b.joinWindow, now) === "OPEN"),
    )
    .sort((a, b) => new Date(a.scheduledAt as string).getTime() - new Date(b.scheduledAt as string).getTime());

  return (
    <div className="mt-5">
      {upcoming.length === 0 ? (
        <div className="rounded-2xl border border-pd-line bg-white">
          <PdEmpty
            icon={Video}
            title="No demos coming up"
            text="Demos booked by parents on your courses appear here."
          />
        </div>
      ) : (
        <div className={TD_CARD}>
          {upcoming.map((b) => (
            <DemoRow key={b.id} b={b} meetEnabled={meetEnabled} skewMs={skewMs} />
          ))}
        </div>
      )}
    </div>
  );
}
