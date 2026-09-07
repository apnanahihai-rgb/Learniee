"use client";

import { CalendarClock, Sparkles } from "lucide-react";

import {
  useTeacherDemoBookings,
  type TeacherDemoBookingListItem,
} from "@/features/teacher/hooks/useDemoBookings";

/**
 * "Demo" sidebar entry — previously pointed at /teacher/demo with no
 * page behind it (dead link). Shows every demo booking made with
 * this teacher, most recent first, split into "Upcoming" and
 * "Past / other" — mirrors /parent/free-demo's booking list, minus
 * the coupon-purchase block (buying demo coupons is a Parent-only
 * action).
 */
export default function TeacherDemoPage() {
  const { bookings, loading, error } = useTeacherDemoBookings();

  const now = Date.now();
  const upcoming = bookings
    .filter((b) => b.scheduledAt && new Date(b.scheduledAt).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(a.scheduledAt as string).getTime() -
        new Date(b.scheduledAt as string).getTime(),
    );
  const pastOrUnscheduled = bookings
    .filter(
      (b) => !b.scheduledAt || new Date(b.scheduledAt).getTime() < now,
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
          <CalendarClock size={20} />
        </span>
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-brand">
            Demo
          </p>
          <h1 className="font-heading text-xl font-bold text-gray-800">
            Demo bookings
          </h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-4 text-sm border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-violet-50 animate-pulse"
            />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-8 text-center">
          <p className="text-gray-500">
            No demos booked with you yet — this fills up automatically as
            parents book a demo session on one of your courses.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                Upcoming
              </p>
              <div className="space-y-2">
                {upcoming.map((booking) => (
                  <BookingRow key={booking.id} booking={booking} />
                ))}
              </div>
            </div>
          )}

          {pastOrUnscheduled.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                Past / other
              </p>
              <div className="space-y-2">
                {pastOrUnscheduled.map((booking) => (
                  <BookingRow key={booking.id} booking={booking} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function statusLabel(booking: TeacherDemoBookingListItem) {
  switch (booking.status) {
    case "CONFIRMED":
      return { text: "Confirmed", className: "bg-emerald-50 text-emerald-600" };
    case "PENDING_PAYMENT":
      return { text: "Pending payment", className: "bg-amber-50 text-amber-600" };
    case "COMPLETED":
      return { text: "Completed", className: "bg-violet-100 text-brand" };
    case "CANCELLED":
      return { text: "Cancelled", className: "bg-gray-100 text-gray-500" };
    default:
      return { text: booking.status, className: "bg-gray-100 text-gray-500" };
  }
}

function BookingRow({ booking }: { booking: TeacherDemoBookingListItem }) {
  const status = statusLabel(booking);
  const childName = booking.student.visibleName || booking.student.firstName;
  const parentName = booking.parent
    ? booking.parent.visibleName ||
      `${booking.parent.firstName} ${booking.parent.lastName}`.trim()
    : "Parent";

  return (
    <div className="flex items-start gap-3 bg-white border border-violet-100 rounded-2xl p-4">
      <span className="w-9 h-9 rounded-xl bg-violet-50 text-brand flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles size={16} />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-gray-800 truncate">
            {booking.course.courseTitle || "Demo session"}
          </p>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${status.className}`}
          >
            {status.text}
          </span>
        </div>

        <p className="text-xs text-gray-500 mt-0.5">
          {parentName} · for {childName}
          {booking.subject ? ` · ${booking.subject}` : ""}
        </p>

        <p className="text-xs text-gray-400 mt-1">
          {booking.scheduledAt
            ? new Date(booking.scheduledAt).toLocaleString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              })
            : "Time not set"}
          {booking.isPaid && booking.amount
            ? ` · ₹${booking.amount} demo`
            : " · Free demo"}
        </p>
      </div>
    </div>
  );
}
