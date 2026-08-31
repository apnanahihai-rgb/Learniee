"use client";

import { useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Info, Loader2 } from "lucide-react";

import BookingCalendar from "@/features/parent/components/course-detail/BookingCalendar";
import { useStudents } from "@/features/parent/hooks/useStudents";
import { useDemoCoupons } from "@/features/parent/hooks/useDemoCoupons";

interface Props {
  price: string | null;
  teacherId: string;
  courseId: string;
  subject: string | null;
}

// Cycle rule (updated Aug 31, 2026, per direct clarification —
// supersedes 06-OPEN-DECISIONS.md #25's old fixed 4/8/12/24/30
// set): minimum 4 sessions/month, any integer above that, capped
// at 1 session/day for the longest possible month (31).
const MIN_SESSIONS_PER_MONTH = 4;
const MAX_SESSIONS_PER_MONTH = 31;

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
 * "Enroll Now" is wired to the real Enrollment backend
 * (enrollment.service.ts): picking a cycle (sessions/month + number
 * of months) auto-calculates rate/monthly-rate/total, same as
 * 03-DATA-MODEL.md describes — nothing is entered manually.
 * Payment isn't integrated yet (Razorpay, 02-ARCHITECTURE.md), so
 * this only creates the Enrollment row for Accounts to bill against
 * later; dual approval (Teacher + Admin) also isn't built yet
 * (06-OPEN-DECISIONS.md #2 is still open), so every new enrollment
 * starts as "Pending approval".
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

  // Enroll — separate from the demo-booking state above since a
  // parent may enroll without booking another demo first (they
  // might already be past their demos for this teacher/subject).
  const [sessionsPerMonth, setSessionsPerMonth] = useState<number | "">("");
  const [noOfMonths, setNoOfMonths] = useState(1);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);

  const { students, loading: studentsLoading } = useStudents();
  const {
    balance,
    loading: balanceLoading,
    reload: reloadBalance,
  } = useDemoCoupons();

  const selectionLabel = formatSelection(selectedDate, selectedHour);
  const remainingFree = balance?.remainingFree ?? 0;
  const paidDemoPrice = balance?.paidDemoPrice ?? 100;

  // Client-side preview only — the authoritative calculation always
  // happens server-side in enrollment.service.ts. Rate is treated as
  // a PER-SESSION rate here (see that file's doc-comment for why —
  // this is a flagged assumption, not a settled rule).
  const ratePerSession = price ? Number(price) : null;
  const pricePreview = useMemo(() => {
    if (!ratePerSession || !sessionsPerMonth) return null;

    const monthlyRate = ratePerSession * sessionsPerMonth;
    const totalAmount = monthlyRate * noOfMonths;

    return { monthlyRate, totalAmount };
  }, [ratePerSession, sessionsPerMonth, noOfMonths]);

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

  async function handleEnroll() {
    if (!selectedStudentId) {
      setEnrollError("Pick which child this enrollment is for.");
      return;
    }

    if (!sessionsPerMonth) {
      setEnrollError("Pick how many sessions per month.");
      return;
    }

    setEnrolling(true);
    setEnrollError("");
    setEnrollSuccess(null);

    try {
      const res = await fetch("/api/parent/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          teacherId,
          courseId,
          subject,
          sessionsPerMonth,
          noOfMonths,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to enroll.");
      }

      setEnrollSuccess(
        "Enrollment created — it's now pending Teacher and Admin approval. Payment collection is coming soon.",
      );
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : "Failed to enroll.");
    } finally {
      setEnrolling(false);
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
            {/* Was "/mo" — changed to "/session" to match the rate
                enrollment.service.ts actually calculates against.
                Flagged in 06-OPEN-DECISIONS.md as an assumption
                pending sign-off, not a settled label. */}
            <span className="text-[11px] font-medium text-gray-400">
              /session
            </span>
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

      {/* CHILD PICKER — shared by both Book Demo and Enroll below;
          for a demo, the (teacher, subject, child) cap is enforced
          server-side. */}
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
      </div>

      <div className="flex items-start gap-2 mt-4 text-[11px] text-gray-400 leading-relaxed">
        <Info size={13} className="flex-shrink-0 mt-0.5" />
        <span>
          Every account gets 2 free demo sessions in total (not per child) —
          after that, each demo is a flat ₹100. Pick a date and time above
          so the session can actually be arranged — bookings without a
          time aren&apos;t accepted.
        </span>
      </div>

      {/* ENROLL — a cycle is sessions/month (min 4, max 1/day i.e.
          up to 31 — updated Aug 31, 2026, supersedes the old
          06-OPEN-DECISIONS.md #25 fixed set) + a number of months.
          Rate/monthly-rate/total are always calculated server-side
          in enrollment.service.ts; this preview is client-side only
          so the parent sees the total before submitting. Payment
          collection isn't wired in yet, and dual approval (Teacher +
          Admin, #2 still open) hasn't been built either — this only
          creates the Enrollment row, which starts "Pending
          approval". */}
      <div className="mt-6 pt-5 border-t border-violet-50">
        <h3 className="font-heading text-sm font-bold text-gray-800 mb-3">
          Enroll in this course
        </h3>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Sessions / month
            </label>
            <input
              type="number"
              min={MIN_SESSIONS_PER_MONTH}
              max={MAX_SESSIONS_PER_MONTH}
              value={sessionsPerMonth}
              onChange={(e) => {
                const raw = e.target.value;
                if (!raw) {
                  setSessionsPerMonth("");
                  return;
                }
                const n = Math.min(
                  MAX_SESSIONS_PER_MONTH,
                  Math.max(MIN_SESSIONS_PER_MONTH, Number(raw) || 0),
                );
                setSessionsPerMonth(n);
              }}
              placeholder={`${MIN_SESSIONS_PER_MONTH}–${MAX_SESSIONS_PER_MONTH}`}
              className="w-full text-sm border border-violet-100 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              No. of months
            </label>
            <input
              type="number"
              min={1}
              max={12}
              value={noOfMonths}
              onChange={(e) =>
                setNoOfMonths(
                  Math.min(12, Math.max(1, Number(e.target.value) || 1)),
                )
              }
              className="w-full text-sm border border-violet-100 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        </div>

        {pricePreview && (
          <div className="text-xs text-gray-600 bg-violet-50 rounded-xl px-3 py-2.5 mb-3 space-y-0.5">
            <p>
              Monthly rate:{" "}
              <span className="font-bold text-gray-800">
                ₹{pricePreview.monthlyRate.toLocaleString("en-IN")}
              </span>
            </p>
            <p>
              Total for {noOfMonths} month{noOfMonths === 1 ? "" : "s"}:{" "}
              <span className="font-bold text-gray-800">
                ₹{pricePreview.totalAmount.toLocaleString("en-IN")}
              </span>
            </p>
          </div>
        )}

        {enrollError && (
          <p className="text-xs text-red-600 mb-2">{enrollError}</p>
        )}

        {enrollSuccess && (
          <div className="flex items-start gap-2 text-xs text-emerald-600 font-semibold mb-2">
            <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
            {enrollSuccess}
          </div>
        )}

        <button
          type="button"
          onClick={handleEnroll}
          disabled={
            enrolling ||
            studentsLoading ||
            students.length === 0 ||
            !sessionsPerMonth
          }
          title={!sessionsPerMonth ? "Pick a cycle first" : undefined}
          className="w-full text-sm font-bold text-white bg-brand-dark px-4 py-2.5 rounded-full disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {enrolling && <Loader2 size={14} className="animate-spin" />}
          Enroll Now
        </button>

        <p className="flex items-start gap-2 mt-3 text-[11px] text-gray-400 leading-relaxed">
          <Info size={13} className="flex-shrink-0 mt-0.5" />
          Payment collection isn&apos;t live yet, so enrolling now just
          reserves your cycle — Teacher and Admin approval, then payment,
          come next.
        </p>
      </div>
    </div>
  );
}
