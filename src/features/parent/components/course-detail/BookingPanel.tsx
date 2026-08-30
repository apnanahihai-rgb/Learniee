"use client";

import { useState } from "react";
import { CalendarCheck, Info } from "lucide-react";

import BookingCalendar from "@/features/parent/components/course-detail/BookingCalendar";

interface Props {
  price: string | null;
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
 * Session-booking preview: pick a date + time on the calendar, then
 * "Book Free Demo" / "Enroll Now". Both CTAs stay disabled — same
 * pattern as CourseCard's disabled JOIN button — because
 * Enrollment and DemoCoupon aren't modeled yet (03-DATA-MODEL.md /
 * 01-PROJECT-STATUS.md §4's "Not Started" backend rows). This
 * exists so the calendar UX is ready to wire up to a real booking
 * API the moment that backend lands, instead of being built twice.
 */
export default function BookingPanel({ price }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const selectionLabel = formatSelection(selectedDate, selectedHour);

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

      <p className="text-xs text-gray-400 mb-4">
        Pick a date and time to preview a demo or enrollment session.
      </p>

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

      {/* Enrollment/DemoCoupon aren't built yet — see the comment
          above. Disabled + tooltip, matching CourseCard's JOIN
          button rather than pretending this books anything. */}
      <div className="grid grid-cols-1 gap-2 mt-5">
        <button
          type="button"
          disabled
          title="Demo booking isn't available yet"
          className="w-full text-sm font-bold text-gray-400 bg-gray-100 px-4 py-2.5 rounded-full cursor-not-allowed"
        >
          Book Free Demo
        </button>

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
          Demo &amp; enrollment booking is still being built. This calendar
          shows what picking a session will look like once it&apos;s live.
        </span>
      </div>
    </div>
  );
}
