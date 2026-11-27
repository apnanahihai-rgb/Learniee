import {
    createNotification,
    createNotifications
} from "@/features/shared/server/notification.service";
import { countGroupClassStudents } from "@/features/shared/server/groupClass.service";
import { prisma } from "@/lib/prisma";
import "server-only";
import { R, T, displayName, safe } from './shared';

// ---------------------------------------------------------------------------
// Class sessions
// ---------------------------------------------------------------------------

export function notifyClassSessionCompleted(sessionId: string) {
  return safe("class session completed", async () => {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      select: {
        parentId: true,
        teacherId: true,
        scheduledDate: true,
        cycleId: true,
        enrollment: { select: { course: { select: { courseTitle: true } } } },
      },
    });
    if (!session) return;

    const courseTitle = session.enrollment.course.courseTitle || "your class";
    const dateLabel = session.scheduledDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });

    // Cycle-model classes (Part 2A): the parent has 48 hours to
    // confirm or report, from the class page.
    if (session.cycleId) {
      await createNotification({
        recipientId: session.parentId,
        recipientRole: R.PARENT,
        type: T.CLASS_SESSION_COMPLETED,
        title: "Class completed",
        message: `The ${dateLabel} class for "${courseTitle}" is complete. Tap All good, or report a problem, within 48 hours — otherwise it is accepted automatically.`,
        link: `/parent/classes/${sessionId}/join`,
      });
      return;
    }

    await createNotification({
      recipientId: session.parentId,
      recipientRole: R.PARENT,
      type: T.CLASS_SESSION_COMPLETED,
      title: "Class marked complete",
      message: `The ${dateLabel} class for "${courseTitle}" was marked complete by the teacher.`,
      link: "/parent/calendar",
    });
  });
}
/**
 * "Lecture will start in X" — called only from the reminder cron
 * (/api/cron/session-reminders), never from request-handling code,
 * since it needs to fire on a schedule rather than in response to a
 * user action. `minutesUntil` is folded into the copy directly
 * rather than left for the client to compute.
 */
export function notifyClassSessionStartingSoon(
  sessionId: string,
  minutesUntil: number,
  options: {
    /**
     * Group class: the teacher holds ONE class for every student, so the
     * reminder job tells the teacher once and sets this for the rest.
     */
    skipTeacher?: boolean;
  } = {},
) {
  return safe("class session reminder", async () => {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        parentId: true,
        teacherId: true,
        scheduledTime: true,
        startsAt: true,
        enrollment: {
          select: {
            courseId: true,
            course: { select: { courseTitle: true, type: true } },
            student: { select: { firstName: true, visibleName: true } },
          },
        },
      },
    });
    if (!session) return;

    const courseTitle = session.enrollment.course.courseTitle || "your class";
    const studentName = displayName({
      firstName: session.enrollment.student.firstName,
      visibleName: session.enrollment.student.visibleName,
    });
    const timeLabel = session.scheduledTime ? ` at ${session.scheduledTime}` : "";
    const group = await countGroupClassStudents(session);

    // The links open the class page, where the Join / Start button opens the
    // shared Google Meet room (the room itself is made on the first Start/Join).
    const parentLink = `/parent/classes/${sessionId}/join`;
    const teacherLink = `/teacher/classes/${sessionId}/start`;

    const items: Parameters<typeof createNotifications>[0] = [
      {
        recipientId: session.parentId,
        recipientRole: R.PARENT,
        type: T.CLASS_SESSION_REMINDER,
        title: group ? "Group class starting soon" : "Class starting soon",
        message: group
          ? `${studentName}'s "${courseTitle}" group class starts in about ${minutesUntil} minutes${timeLabel}. Open this to join.`
          : `${studentName}'s "${courseTitle}" class starts in about ${minutesUntil} minutes${timeLabel}. Open this to join.`,
        link: parentLink,
      },
    ];

    if (!options.skipTeacher) {
      items.push({
        recipientId: session.teacherId,
        recipientRole: R.TEACHER,
        type: T.CLASS_SESSION_REMINDER,
        title: group ? "Group class starting soon" : "Class starting soon",
        message: group
          ? `Your "${courseTitle}" group class (${group.size} ${group.size === 1 ? "student" : "students"}) starts in about ${minutesUntil} minutes${timeLabel}. Open this to start the shared class.`
          : `Your "${courseTitle}" class with ${studentName} starts in about ${minutesUntil} minutes${timeLabel}. Open this to start the class.`,
        link: teacherLink,
      });
    }

    await createNotifications(items);
  });
}
