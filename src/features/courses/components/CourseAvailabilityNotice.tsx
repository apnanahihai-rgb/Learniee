import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { formatSlotRange, type AvailabilitySlot } from "@/features/shared/utils/availability";
import { WEEKDAY_LABELS } from "@/features/shared/utils/weekdays";

interface Props {
  slots: AvailabilitySlot[];
  loading: boolean;
  loadFailed: boolean;
}

/** Create-course form: asks for availability first, or shows what the Teacher has set. */
export default function CourseAvailabilityNotice({ slots, loading, loadFailed }: Props) {
  if (loading) return null;

  if (loadFailed) {
    return (
      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
        We couldn&apos;t load your availability, so you can&apos;t create a course right now. Refresh the page to try again.
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
        <CalendarClock size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
        <div>
          <p className="font-semibold">Set your availability first</p>
          <p className="mt-0.5">
            Add the days and times you can teach in your Calendar so we can manage course creation and
            enrollments properly. You can create a course once it&apos;s saved.
          </p>
          <Link
            href="/teacher/calendar"
            className="mt-2 inline-block rounded-lg bg-amber-600 px-3.5 py-1.5 font-semibold text-white hover:bg-amber-700"
          >
            Set availability
          </Link>
        </div>
      </div>
    );
  }

  const byDay = new Map<number, string[]>();
  for (const s of slots) byDay.set(s.dayOfWeek, [...(byDay.get(s.dayOfWeek) ?? []), formatSlotRange(s)]);

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
      <CalendarClock size={18} className="mt-0.5 shrink-0 text-violet-600" aria-hidden="true" />
      <div className="min-w-0">
        <p>
          <span className="font-semibold">Your availability (IST): </span>
          {[...byDay.entries()].map(([day, ranges]) => `${WEEKDAY_LABELS[day]} ${ranges.join(", ")}`).join(" · ")}
        </p>
        <p className="mt-0.5 text-violet-700">
          Courses can only use these days and times.{" "}
          <Link href="/teacher/calendar" className="font-semibold underline">
            Edit availability
          </Link>
        </p>
      </div>
    </div>
  );
}
