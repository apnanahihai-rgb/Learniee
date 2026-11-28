import { createNotification, createNotifications } from "@/features/shared/server/notification.service";
import "server-only";
import { R, T, safe } from "./shared";

/**
 * Group classes (Dec 2026) — continue / renew of a recurring group.
 * Same contract as every trigger: never throws.
 */

export function notifyGroupContinuePrompt(args: {
  teacherId: string;
  courseTitle: string | null;
  batchEndLabel: string;
  reminder?: boolean;
}) {
  return safe("group continue prompt", async () => {
    const title = args.courseTitle || "your group class";

    await createNotification({
      recipientId: args.teacherId,
      recipientRole: R.TEACHER,
      type: args.reminder ? T.GROUP_CONTINUE_REMINDER : T.GROUP_CONTINUE_PROMPT,
      title: args.reminder ? "Reminder: continue this group?" : "Continue this group?",
      message: `Will "${title}" continue after ${args.batchEndLabel}? Please answer before the 4th-last class — that class can't be held until you do.`,
      link: "/teacher/group-classes",
    });
  });
}

/** The Teacher said Yes: every current parent gets the first chance to renew. */
export function notifyGroupRenewalOpen(args: {
  parents: { parentId: string; enrollmentId: string; studentName: string }[];
  courseTitle: string | null;
}) {
  return safe("group renewal open", async () => {
    const title = args.courseTitle || "the group class";

    await createNotifications(
      args.parents.map((p) => ({
        recipientId: p.parentId,
        recipientRole: R.PARENT,
        type: T.GROUP_RENEWAL_OPEN,
        title: "Group is continuing — renew now",
        message: `"${title}" will continue. As a current family you get the first chance to renew ${p.studentName}'s seat.`,
        link: `/parent/my-classes/${p.enrollmentId}`,
      })),
    );
  });
}

/** The Teacher said No: every current parent is told the group is closing. */
export function notifyGroupClosing(args: {
  parents: { parentId: string; enrollmentId: string; studentName: string }[];
  courseTitle: string | null;
  lastDayLabel: string;
}) {
  return safe("group closing", async () => {
    const title = args.courseTitle || "the group class";

    await createNotifications(
      args.parents.map((p) => ({
        recipientId: p.parentId,
        recipientRole: R.PARENT,
        type: T.GROUP_CLOSING,
        title: "Group class is closing",
        message: `"${title}" won't continue after ${args.lastDayLabel}. ${p.studentName}'s classes run until then; there is nothing to renew.`,
        link: `/parent/my-classes/${p.enrollmentId}`,
      })),
    );
  });
}
