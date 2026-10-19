import { createNotification } from "@/features/shared/server/notification.service";
import "server-only";
import { R, T, safe } from "./shared";

/**
 * Parent-journey notifications (Oct 2026): demo reminders, the post-demo
 * survey prompt and its nudges, renewal reminders and the cycle-ended
 * message. Unlike most triggers these take the already-loaded display
 * data from the sweep that calls them (the sweeps have the rows in hand),
 * so no extra lookups here. Same contract as every trigger: never throws.
 */

export function notifyDemoReminder(args: {
  parentId: string;
  bookingId: string;
  courseTitle: string | null;
  studentName: string;
  kind: "DAY" | "HOUR";
}) {
  return safe("demo reminder", async () => {
    const course = args.courseTitle || "your demo";
    await createNotification({
      recipientId: args.parentId,
      recipientRole: R.PARENT,
      type: T.DEMO_REMINDER,
      title: args.kind === "DAY" ? "Demo tomorrow" : "Demo starts in about an hour",
      message:
        args.kind === "DAY"
          ? `${args.studentName}'s demo for "${course}" is tomorrow.`
          : `${args.studentName}'s demo for "${course}" starts in about an hour. The join link opens on the Free Demo page 10 minutes before.`,
      link: "/parent/free-demo",
    });
  });
}

/** Teacher-side demo reminder (Oct 19, 2026). Same type as the parent's, sent to the Teacher. */
export function notifyTeacherDemoReminder(args: {
  teacherId: string;
  bookingId: string;
  courseTitle: string | null;
  studentName: string;
  kind: "DAY" | "HOUR";
}) {
  return safe("teacher demo reminder", async () => {
    const course = args.courseTitle || "a course";
    await createNotification({
      recipientId: args.teacherId,
      recipientRole: R.TEACHER,
      type: T.DEMO_REMINDER,
      title: args.kind === "DAY" ? "Demo tomorrow" : "Demo starts in about an hour",
      message:
        args.kind === "DAY"
          ? `Your demo with ${args.studentName} for "${course}" is tomorrow.`
          : `Your demo with ${args.studentName} for "${course}" starts in about an hour. Open Demo to join — the link opens 10 minutes before.`,
      link: "/teacher/demo",
    });
  });
}

export function notifyDemoSurveyPrompt(args: {
  parentId: string;
  bookingId: string;
  courseTitle: string | null;
  studentName: string;
}) {
  return safe("demo survey prompt", async () => {
    await createNotification({
      recipientId: args.parentId,
      recipientRole: R.PARENT,
      type: T.DEMO_SURVEY_PROMPT,
      title: "How was the demo?",
      message: `Tell us how ${args.studentName}'s demo for "${args.courseTitle || "the course"}" went — 3 quick taps.`,
      link: `/parent/demo-feedback/${args.bookingId}`,
    });
  });
}

export function notifyDemoSurveyNudge(args: {
  parentId: string;
  courseId: string;
  studentId: string;
  courseTitle: string | null;
  studentName: string;
  after: "24H" | "3D";
}) {
  return safe("demo survey nudge", async () => {
    const qs = new URLSearchParams({ mode: "enroll", studentId: args.studentId, from: "demo-survey" });
    await createNotification({
      recipientId: args.parentId,
      recipientRole: R.PARENT,
      type: T.DEMO_SURVEY_NUDGE,
      title: "Ready to continue?",
      message:
        args.after === "24H"
          ? `Still thinking about "${args.courseTitle || "the course"}" for ${args.studentName}? Your demo details are saved — enroll whenever you're ready.`
          : `A quick reminder: ${args.studentName} can start "${args.courseTitle || "the course"}" anytime. Prefer to talk it through first? Our counsellors can help.`,
      link: `/parent/courses/${args.courseId}?${qs.toString()}`,
    });
  });
}

export function notifyRenewalReminder(args: {
  parentId: string;
  enrollmentId: string;
  courseTitle: string | null;
  studentName: string;
  daysLeft: number;
  tier: 7 | 5 | 2;
}) {
  return safe("renewal reminder", async () => {
    const course = args.courseTitle || "the course";
    const when = args.daysLeft <= 0 ? "today" : args.daysLeft === 1 ? "tomorrow" : `in ${args.daysLeft} days`;
    const message =
      args.tier === 7
        ? `Renewal is open for ${args.studentName}'s "${course}". The current cycle ends ${when}.`
        : args.tier === 5
          ? `${args.studentName}'s "${course}" cycle ends ${when}. Renew with the same schedule in one tap.`
          : `Last reminder: ${args.studentName}'s "${course}" cycle ends ${when}. Renew now to keep the classes going.`;

    await createNotification({
      recipientId: args.parentId,
      recipientRole: R.PARENT,
      type: T.RENEWAL_REMINDER,
      title: args.tier === 7 ? "Renewal open" : args.tier === 5 ? "Time to renew" : "Last reminder to renew",
      message,
      link: `/parent/my-classes/${args.enrollmentId}`,
    });
  });
}

export function notifyCycleEnded(args: {
  parentId: string;
  enrollmentId: string;
  courseId: string;
  courseTitle: string | null;
  studentName: string;
  stillRenewable: boolean;
}) {
  return safe("cycle ended", async () => {
    const course = args.courseTitle || "the course";
    await createNotification({
      recipientId: args.parentId,
      recipientRole: R.PARENT,
      type: T.CYCLE_ENDED,
      title: "Cycle ended",
      message: args.stillRenewable
        ? `${args.studentName}'s cycle for "${course}" has ended. Renew to continue.`
        : `${args.studentName}'s "${course}" has finished. Leave a review or book again.`,
      link: args.stillRenewable
        ? `/parent/my-classes/${args.enrollmentId}`
        : `/parent/courses/${args.courseId}`,
    });
  });
}
