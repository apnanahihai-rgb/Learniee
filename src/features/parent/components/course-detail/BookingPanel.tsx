"use client";

import { useState } from "react";
import { CalendarCheck, Info, Loader2 } from "lucide-react";

import BookingCalendar from "@/features/parent/components/course-detail/BookingCalendar";
import { useStudents } from "@/features/parent/hooks/useStudents";
import { useDemoCoupons } from "@/features/parent/hooks/useDemoCoupons";

interface Props {
  price: string | null;
  teacherId: string;
  courseId: string;
  subject: string | null;
}

function formatSelection(date: Date | null, hour: number | null) {
  if (!date || hour == null) {
    return null;
  }

  const withTime = new Date(date);
  withTime.setHours(hour, 0, 0, 0);

  return withTime.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Session-booking panel. "Book Demo" is wired to the real
 * DemoCoupon backend (06-OPEN-DECISIONS.md #26): every account
 * gets 2 free demo sessions total — shared across every child, not
 * 2 per child — then a flat ₹100 each, capped at 1 demo per
 * (teacher, subject, child).
 *
 * Picking a date and time from BookingCalendar is required before
 * "Book Demo" is enabled — a demo can't be arranged without a
 * specific slot, so the button stays disabled and the request is
 * also rejected server-side (see demoCoupon.service.ts) if no
 * scheduledAt is sent.
 *
 * "Enroll Now" stays disabled — Enrollment still isn't modeled
 * (03-DATA-MODEL.md), same reasoning as before.
 */
export default function BookingPanel({
  price,
  teacherId,
  courseId,
  subject,
}: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  const { students, loading: studentsLoading } = useStudents();
  const {
    balance,
    loading: balanceLoading,
    reload: reloadBalance,
  } = useDemoCoupons();

  const selectionLabel = formatSelection(selectedDate, selectedHour);
  const remainingFree = balance?.remainingFree ?? 0;
  const paidDemoPrice = balance?.paidDemoPrice ?? 100;

  async function handleBookDemo() {
    if (!selectedStudentId) {
      setBookingError("Pick which child this demo is for.");
      return;
    }

    // A demo has to be arranged for a specific time — date and
    // time selection is now required, not optional, before booking.
    if (!selectedDate || selectedHour == null) {
      setBookingError(
        "Pick a date and time from the calendar below before booking.",
      );
      return;
    }

    setBooking(true);
    setBookingError("");
    setBookingSuccess(null);

    try {
      const withTime = new Date(selectedDate);
      withTime.setHours(selectedHour, 0, 0, 0);
      const scheduledAt = withTime.toISOString();

      const res = await fetch("/api/parent/demo-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          teacherId,
          courseId,
          subject,
          scheduledAt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to book demo.");
      }

      setBookingSuccess(
        data.usedFreeCoupon
          ? "Free demo booked! We'll be in touch to confirm the time."
          : `Demo booked — ₹${paidDemoPrice} will be collected before the session (online payment collection is coming soon).`,
      );

      reloadBalance();
    } catch (err) {
      setBookingError(
        err instanceof Error ? err.message : "Failed to book demo.",
      );
    } finally {
      setBooking(false);
    }
  }

  return (
    <div className="bg-white border border-violet-100 rounded-3xl shadow-sm p-5 sm:p-6 lg:sticky lg:top-20">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-heading text-base font-bold text-gray-800">
          Book a session
        </h2>

        {price && (
          <span className="text-sm font-bold text-gray-800">
            ₹{price}
            <span className="text-[11px] font-medium text-gray-400">/mo</span>
          </span>
        )}
      </div>

      {!balanceLoading && (
        <p className="text-xs text-gray-400 mb-4">
          {remainingFree > 0
            ? `${remainingFree} free demo session${remainingFree === 1 ? "" : "s"} left on your account.`
            : `No free demos left — demos are ₹${paidDemoPrice} each.`}
        </p>
      )}

      {/* CHILD PICKER — a demo is booked for one specific child, and
          the (teacher, subject, child) cap is enforced server-side. */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          Which child is this for?
        </label>

        {studentsLoading ? (
          <div className="h-10 rounded-xl bg-violet-50 animate-pulse" />
        ) : students.length === 0 ? (
          <p className="text-xs text-gray-400">
            Add a child profile from the dashboard before booking a demo.
          </p>
        ) : (
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full text-sm border border-violet-100 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
          >
            <option value="">Select a child</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.visibleName || s.firstName}
              </option>
            ))}
          </select>
        )}
      </div>

      <BookingCalendar
        selectedDate={selectedDate}
        selectedHour={selectedHour}
        onSelectDate={(date) => {
          setSelectedDate(date);
          setSelectedHour(null);
        }}
        onSelectHour={setSelectedHour}
      />

      {selectionLabel && (
        <div className="flex items-center gap-2 mt-4 text-xs font-semibold text-brand bg-violet-50 rounded-xl px-3 py-2">
          <CalendarCheck size={14} className="flex-shrink-0" />
          {selectionLabel}
        </div>
      )}

      {bookingError && (
        <p className="text-xs text-red-600 mt-3">{bookingError}</p>
      )}

      {bookingSuccess && (
        <p className="text-xs text-emerald-600 font-semibold mt-3">
          {bookingSuccess}
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 mt-5">
        <button
          type="button"
          onClick={handleBookDemo}
          disabled={
            booking ||
            studentsLoading ||
            students.length === 0 ||
            !selectedDate ||
            selectedHour == null
          }
          title={
            !selectedDate || selectedHour == null
              ? "Pick a date and time first"
              : undefined
          }
          className="w-full text-sm font-bold text-white bg-brand px-4 py-2.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {booking && <Loader2 size={14} className="animate-spin" />}
          {remainingFree > 0
            ? "Book Free Demo"
            : `Book Demo — ₹${paidDemoPrice}`}
        </button>

        {/* Enrollment isn't built yet (Enrollment isn't modeled in
            Prisma — see 03-DATA-MODEL.md / 01-PROJECT-STATUS.md).
            This stays disabled until that's built, matching the
            same disabled/"Coming Soon" pattern used elsewhere. */}
        <button
          type="button"
          disabled
          title="Enrollment isn't available yet"
          className="w-full text-sm font-bold text-white bg-brand/40 px-4 py-2.5 rounded-full cursor-not-allowed"
        >
          Enroll Now
        </button>
      </div>

      <div className="flex items-start gap-2 mt-4 text-[11px] text-gray-400 leading-relaxed">
        <Info size={13} className="flex-shrink-0 mt-0.5" />
        <span>
          Every account gets 2 free demo sessions in total (not per child) —
          after that, each demo is a flat ₹100. Pick a date and time above
          so the session can actually be arranged — bookings without a
          time aren&apos;t accepted. Enrollment booking is still being
          built; this calendar previews what picking a session will look
          like once it&apos;s live.
        </span>
      </div>
    </div>
  );
}
