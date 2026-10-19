"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Video } from "lucide-react";

import DemoJoinButton, {
  liveDemoJoinState,
} from "@/features/shared/components/DemoJoinButton";
import { useTeacherDemoBookings } from "@/features/teacher/hooks/useDemoBookings";

/**
 * "Demos" section of the Teacher dashboard home (Oct 19, 2026): the next few
 * confirmed demos with a Start button, so a teacher doesn't have to open the
 * Demo page to find the Meet link. Same data as `/teacher/demo`.
 */
export default function UpcomingDemosCard() {
  const { bookings, loading, error, meetEnabled, skewMs } = useTeacherDemoBookings();

  const now = Date.now();
  const upcoming = bookings
    .filter(
      (b) =>
        b.status === "CONFIRMED" &&
        !!b.scheduledAt &&
        (new Date(b.scheduledAt).getTime() >= now ||
          liveDemoJoinState(b.joinWindow, now + skewMs) === "OPEN"),
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledAt as string).getTime() - new Date(b.scheduledAt as string).getTime(),
    );

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-violet-100 text-brand flex items-center justify-center flex-shrink-0">
            <Video size={18} />
          </span>
          <h2 className="font-heading text-lg font-bold text-gray-800">Upcoming demos</h2>
        </div>
        <Link
          href="/teacher/demo"
          className="text-sm font-semibold text-brand hover:text-brand-dark flex items-center gap-1"
        >
          All demos
          <ArrowRight size={14} />
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-4 text-sm border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-violet-100 bg-violet-50/60 animate-pulse h-24" />
          ))}
        </div>
      ) : upcoming.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-6 text-center text-sm text-gray-500">
          No demos coming up — they show here as soon as a parent books a demo on one of your courses.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {upcoming.slice(0, 4).map((b) => {
            const child = b.student.visibleName || b.student.firstName;

            return (
              <div key={b.id} className="bg-white rounded-2xl border border-violet-100 p-4">
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-xl bg-violet-50 text-brand flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-800 truncate">
                      {b.course.courseTitle || "Demo session"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      for {child}
                      {b.subject ? ` · ${b.subject}` : ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(b.scheduledAt as string).toLocaleString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <DemoJoinButton
                  role="teacher"
                  bookingId={b.id}
                  status={b.status}
                  joinWindow={b.joinWindow}
                  meetEnabled={meetEnabled}
                  skewMs={skewMs}
                  className="mt-3"
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
