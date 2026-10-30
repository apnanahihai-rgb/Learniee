"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import ChildPicker from "./booking/ChildPicker";
import DemoBookingSection from "./booking/DemoBookingSection";
import EnrollSection from "./booking/EnrollSection";
import { useDemoBooking } from "./booking/useDemoBooking";
import { useEnrollment } from "./booking/useEnrollment";
import { useTeacherAvailabilityForBooking } from "@/features/parent/hooks/useTeacherAvailability";
import { useStudents } from "@/features/parent/hooks/useStudents";
import { useDemoCoupons } from "@/features/parent/hooks/useDemoCoupons";

interface Props {
  price: string | null;
  teacherId: string;
  courseId: string;
  subject: string | null;
}

/**
 * Session-booking panel. Both "Book Demo" and "Enroll Now" are
 * payment-gated (Razorpay) end to end:
 *
 * - "Book Demo": free while the account still has one of its 2 free
 *   demos (06-OPEN-DECISIONS.md #26) — no payment involved. Once
 *   those are used, this opens Razorpay Checkout for the flat ₹100
 *   fee before the booking is created.
 * - "Enroll Now": always payment-gated. One enrollment = one
 *   monthly cycle (start date to the same date next month minus one
 *   day); the parent picks weekdays, a time and a start date, the
 *   session count is however many of those weekdays fall in the
 *   cycle (min 4), and the price is session rate x count — see
 *   `cyclePlan.ts`. Then opens Razorpay Checkout for the amount. The
 *   Enrollment row is only created after payment is verified
 *   server-side — see enrollment.service.ts. A paid enrollment then
 *   enters the sequential dual-approval flow (Teacher, then Admin —
 *   resolves 06-OPEN-DECISIONS.md #2). Parent-facing copy always
 *   frames this as "waiting for teacher approval", never mentioning
 *   Admin by name, per direct instruction.
 *
 * All amounts are INR — Razorpay's "International Payments" account
 * setting is what lets a non-Indian card pay this same INR amount;
 * the cardholder's own bank/network does the conversion and any
 * forex fee lands on them, not on Learnie.
 */
export default function BookingPanel({
  price,
  teacherId,
  courseId,
  subject,
}: Props) {
  // Pre-fill from the post-demo survey: /parent/courses/<id>?mode=enroll
  // &studentId=<child>&from=demo-survey opens the Enroll tab with the child
  // already chosen. Read once; the parent can still change anything.
  const searchParams = useSearchParams();
  const prefillStudentId = searchParams.get("studentId") ?? "";
  const fromDemoSurvey = searchParams.get("from") === "demo-survey";

  const [selectedStudentId, setSelectedStudentId] = useState(prefillStudentId);
  const { students, loading: studentsLoading } = useStudents();

  // Never keep a pre-filled child that isn't on this account (a stale or
  // hand-edited link); the server re-checks ownership at payment anyway.
  useEffect(() => {
    if (
      !studentsLoading &&
      selectedStudentId &&
      !students.some((s) => s.id === selectedStudentId)
    ) {
      setSelectedStudentId("");
    }
  }, [studentsLoading, students, selectedStudentId]);
  const { slots: availability, loading: availabilityLoading } =
    useTeacherAvailabilityForBooking(teacherId);
  const {
    balance,
    loading: balanceLoading,
    reload: reloadBalance,
  } = useDemoCoupons();

  const remainingFree = balance?.remainingFree ?? 0;
  const paidDemoPrice = balance?.paidDemoPrice ?? 100;

  const demo = useDemoBooking({
    selectedStudentId,
    teacherId,
    courseId,
    subject,
    remainingFree,
    paidDemoPrice,
    reloadBalance,
  });
  const enroll = useEnrollment({
    price,
    selectedStudentId,
    teacherId,
    courseId,
    subject,
  });

  const [mode, setMode] = useState<"demo" | "enroll">(
    searchParams.get("mode") === "enroll" ? "enroll" : "demo",
  );

  const tabs = [
    {
      value: "demo" as const,
      title: remainingFree > 0 ? "Free Demo" : "Demo",
      sub: remainingFree > 0 ? "Try 1 class first" : `₹${paidDemoPrice} per demo`,
    },
    {
      value: "enroll" as const,
      title: "Enroll",
      sub: "Regular classes",
    },
  ];

  return (
    <div className="bg-white border border-violet-100 rounded-3xl shadow-sm p-5 sm:p-6 lg:sticky lg:top-20">
      <h2 className="font-heading text-base font-bold text-gray-800 mb-4">
        Book this course
      </h2>

      {fromDemoSurvey && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 mb-4 text-xs text-emerald-800 leading-relaxed">
          Glad the demo went well! Your child is already selected — choose a
          plan (monthly or weekly), your days and a start date.
        </div>
      )}

      {/* Shared by both modes; for a demo, the (teacher, subject,
          child) cap is enforced server-side. */}
      <ChildPicker
        students={students}
        loading={studentsLoading}
        value={selectedStudentId}
        onChange={setSelectedStudentId}
      />

      {/* One mode at a time: a demo is a single trial class, enrolling
          is a paid month of regular classes. */}
      <div
        role="tablist"
        aria-label="Booking type"
        className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-violet-50 mb-4"
      >
        {tabs.map((t) => {
          const active = mode === t.value;
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(t.value)}
              className={`rounded-xl px-3 py-2 text-center transition-colors ${
                active
                  ? "bg-white shadow-sm text-brand-dark"
                  : "text-gray-500 hover:text-brand-dark"
              }`}
            >
              <span className="block text-sm font-bold">{t.title}</span>
              <span className="block text-[11px] font-medium opacity-80">
                {t.sub}
              </span>
            </button>
          );
        })}
      </div>

      {mode === "demo" ? (
        <div role="tabpanel">
          <div className="rounded-xl bg-violet-50 px-3 py-2.5 mb-4 text-xs text-gray-600 leading-relaxed">
            <p className="font-bold text-gray-800">One trial class with this teacher</p>
            {!balanceLoading && (
              <p>
                {remainingFree > 0
                  ? `${remainingFree} free demo${remainingFree === 1 ? "" : "s"} left on your account.`
                  : `No free demos left — ₹${paidDemoPrice} per demo.`}
              </p>
            )}
          </div>

          <DemoBookingSection
            demo={demo}
            studentsLoading={studentsLoading}
            studentCount={students.length}
            remainingFree={remainingFree}
            paidDemoPrice={paidDemoPrice}
            availability={availability}
            availabilityLoading={availabilityLoading}
          />
        </div>
      ) : (
        <div role="tabpanel">
          <div className="rounded-xl bg-violet-50 px-3 py-2.5 mb-4 text-xs text-gray-600 leading-relaxed">
            <p className="font-bold text-gray-800">
              Regular classes
              {price && (
                <span className="font-semibold text-gray-600">
                  {" "}
                  · ₹{price}/session
                </span>
              )}
            </p>
            <p>Pick your days and time. Total is shown before you pay.</p>
          </div>

          <EnrollSection
            enroll={enroll}
            studentsLoading={studentsLoading}
            studentCount={students.length}
            availability={availability}
            availabilityLoading={availabilityLoading}
          />
        </div>
      )}
    </div>
  );
}
