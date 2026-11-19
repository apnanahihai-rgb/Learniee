import { occurrenceToEvent, type CalEvent } from "@/features/parent/components/calendar/calendarLogic";
import type { CalendarOccurrence } from "@/features/shared/types/calendar";
import type { TeacherDemoBookingListItem } from "@/features/teacher/hooks/useDemoBookings";

const DEMO_MINUTES = 45;

/** A class on the Teacher calendar: same as the Parent one, but it links to the Teacher's Start page. */
export function teacherOccurrenceToEvent(o: CalendarOccurrence): CalEvent | null {
  const event = occurrenceToEvent(o);
  if (!event) return null;

  return { ...event, href: o.startsAt ? `/teacher/classes/${o.id}/start` : null };
}

/** A confirmed or finished demo on the Teacher calendar (links to the Demos tab of Requests). */
export function teacherDemoToEvent(b: TeacherDemoBookingListItem): CalEvent | null {
  if (!b.scheduledAt) return null;
  if (b.status !== "CONFIRMED" && b.status !== "COMPLETED") return null;

  const start = new Date(b.scheduledAt);

  return {
    id: `demo-${b.id}`,
    kind: "demo",
    start,
    hasTime: true,
    end: new Date(start.getTime() + DEMO_MINUTES * 6e4),
    title: b.course.courseTitle ?? b.subject,
    subject: b.subject,
    teacherName: "",
    studentId: b.student.id,
    studentName: b.student.visibleName?.trim() || b.student.firstName,
    state: b.status === "COMPLETED" ? "held" : "upcoming",
    href: "/teacher/requests?tab=demos",
  };
}
