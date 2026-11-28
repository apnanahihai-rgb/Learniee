import "server-only";

import {
  EnrollmentStatus,
  GroupContinuationDecision,
  GroupKind as DbGroupKind,
} from "@prisma/client";

import { GROUP_CLASS_TYPE, isGroupType, parseGroupMaxStudents } from "@/features/courses/utils/groupClass";
import {
  continueAskFromKey,
  fourthLastClassKey,
  nextReminderAt,
  type GroupContinueAction,
  type GroupHoldState,
} from "@/features/courses/utils/groupContinue";
import { countGroupSeats } from "@/features/parent/server/enrollment/group";
import {
  notifyGroupClosing,
  notifyGroupContinuePrompt,
  notifyGroupRenewalOpen,
} from "@/features/shared/server/notificationTriggers.service";
import {
  addDays,
  calendarDateToDate,
  dateToCalendarDate,
  parseDateKey,
  platformWallClockToUtc,
  toDateKey,
  todayInPlatformTz,
} from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";

/**
 * Group classes (Dec 2026) — continue / renew of RECURRING groups.
 *
 * A recurring group runs in batches: the students' current cycle, told apart
 * by the cycle's end date. For every batch the Teacher must answer "continue?"
 * (`GroupContinuation`, one row per course + batch end):
 *
 *  - Asked 10 days before a monthly batch ends, or after week 2 of a weekly
 *    group's batch ("remind me later" is allowed until the deadline).
 *  - Required before the 4th-last class of the batch, which can't be started
 *    until the answer is Yes or No (`getGroupClassStartBlock`).
 *  - No: every current parent is told the group is closing, no one can renew,
 *    and registration closes.
 *  - Yes: the Teacher sets the group size (it may stay the same) and every
 *    current parent is told to renew — renewal stays shut until this answer
 *    (`getGroupRenewalHold`), so current families always get first chance.
 *    Their seats are held until the batch ends; new sign-ups only get the
 *    seats beyond them (seats = enrollments, see `countGroupSeats`).
 *
 * Rows are created lazily from the live enrollments, from the daily sweep, the
 * Teacher's screen and the renewal / Start checks — whichever comes first.
 * Every write is a conditional update, so repeats and races are harmless.
 */

export class GroupContinueError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const dayLabel = (date: Date) =>
  date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/* ── Creating the batch rows ─────────────────────────────────────────── */

/**
 * Makes sure every running batch of every recurring group (or just one
 * course / one Teacher's) has its `GroupContinuation` row. Safe to repeat.
 * Courses already closed get no new rows.
 */
export async function ensureGroupContinuations(
  scope: { courseId?: string; teacherId?: string } = {},
  now: Date = new Date(),
): Promise<void> {
  const today = todayInPlatformTz(now);
  const todayDate = calendarDateToDate(today);

  const enrollments = await prisma.enrollment.findMany({
    where: {
      isLegacy: false,
      status: EnrollmentStatus.ACTIVE,
      course: {
        type: { equals: GROUP_CLASS_TYPE, mode: "insensitive" },
        groupKind: DbGroupKind.RECURRING,
        ...(scope.courseId ? { id: scope.courseId } : {}),
        ...(scope.teacherId ? { teacherId: scope.teacherId } : {}),
      },
    },
    select: {
      courseId: true,
      course: { select: { teacherId: true, groupDays: true, groupTime: true, groupRecurrence: true } },
      cycles: {
        orderBy: { cycleNumber: "desc" },
        take: 1,
        select: { startDate: true, endDate: true },
      },
    },
    take: 5000,
  });

  if (enrollments.length === 0) return;

  const courseIds = [...new Set(enrollments.map((e) => e.courseId))];

  const closed = await prisma.groupContinuation.findMany({
    where: { courseId: { in: courseIds }, decision: GroupContinuationDecision.CLOSE },
    select: { courseId: true },
    distinct: ["courseId"],
  });
  const closedIds = new Set(closed.map((row) => row.courseId));

  // One batch per (course, cycle end); its start is the earliest cycle start.
  const batches = new Map<
    string,
    {
      courseId: string;
      teacherId: string;
      days: number[];
      time: string;
      recurrence: "WEEKLY" | "MONTHLY" | null;
      start: Date;
      end: Date;
    }
  >();

  for (const e of enrollments) {
    const cycle = e.cycles[0];

    if (!cycle || closedIds.has(e.courseId)) continue;
    if (cycle.endDate.getTime() < todayDate.getTime()) continue;
    if (e.course.groupDays.length === 0 || !e.course.groupTime) continue;

    const key = `${e.courseId}|${cycle.endDate.toISOString()}`;
    const existing = batches.get(key);

    if (existing) {
      if (cycle.startDate.getTime() < existing.start.getTime()) existing.start = cycle.startDate;
      continue;
    }

    batches.set(key, {
      courseId: e.courseId,
      teacherId: e.course.teacherId,
      days: e.course.groupDays,
      time: e.course.groupTime,
      recurrence: e.course.groupRecurrence,
      start: cycle.startDate,
      end: cycle.endDate,
    });
  }

  const data = [];

  for (const batch of batches.values()) {
    const startKey = toDateKey(dateToCalendarDate(batch.start));
    const endKey = toDateKey(dateToCalendarDate(batch.end));
    const mustKey = fourthLastClassKey(batch.days, startKey, endKey);
    const mustDay = parseDateKey(mustKey);

    if (!mustKey || !mustDay) continue;

    data.push({
      courseId: batch.courseId,
      teacherId: batch.teacherId,
      batchStartDate: batch.start,
      batchEndDate: batch.end,
      askFrom: calendarDateToDate(
        parseDateKey(
          continueAskFromKey({
            recurrence: batch.recurrence,
            batchStartKey: startKey,
            batchEndKey: endKey,
            mustAnswerKey: mustKey,
          }),
        ) ?? today,
      ),
      mustAnswerBy: platformWallClockToUtc(mustDay, batch.time),
    });
  }

  if (data.length > 0) {
    await prisma.groupContinuation.createMany({ data, skipDuplicates: true });
  }
}

/* ── Teacher screen ──────────────────────────────────────────────────── */

export interface GroupContinuePrompt {
  id: string;
  courseId: string;
  courseTitle: string;
  batchStartDate: string;
  batchEndDate: string;
  /** When the 4th-last class starts — the answer is needed before it. */
  mustAnswerBy: string;
  /** True once that class has started counting: "remind me later" is no longer offered. */
  overdue: boolean;
  maxStudents: number | null;
  seatsTaken: number;
}

/** The "Continue this group?" questions that are due now for one Teacher (optionally one course). */
export async function listTeacherContinuePrompts(
  teacherId: string,
  courseId?: string,
  now: Date = new Date(),
): Promise<GroupContinuePrompt[]> {
  await ensureGroupContinuations({ teacherId, ...(courseId ? { courseId } : {}) }, now);

  const todayDate = calendarDateToDate(todayInPlatformTz(now));

  const rows = await prisma.groupContinuation.findMany({
    where: {
      teacherId,
      decision: GroupContinuationDecision.PENDING,
      askFrom: { lte: todayDate },
      batchEndDate: { gte: todayDate },
      ...(courseId ? { courseId } : {}),
    },
    orderBy: { mustAnswerBy: "asc" },
    include: { course: { select: { courseTitle: true, groupMaxStudents: true } } },
  });

  const due = rows.filter(
    (row) => row.mustAnswerBy <= now || row.remindAfter === null || row.remindAfter <= now,
  );

  const prompts: GroupContinuePrompt[] = [];

  for (const row of due) {
    prompts.push({
      id: row.id,
      courseId: row.courseId,
      courseTitle: row.course.courseTitle ?? "Group class",
      batchStartDate: toDateKey(dateToCalendarDate(row.batchStartDate)),
      batchEndDate: toDateKey(dateToCalendarDate(row.batchEndDate)),
      mustAnswerBy: row.mustAnswerBy.toISOString(),
      overdue: row.mustAnswerBy <= now,
      maxStudents: row.course.groupMaxStudents,
      seatsTaken: await countGroupSeats(row.courseId),
    });
  }

  return prompts;
}

interface BatchParent {
  parentId: string;
  enrollmentId: string;
  studentName: string;
}

/** Parents of the group's ACTIVE enrollments; `batchEnd` limits it to one batch (null = the whole group). */
async function listGroupParents(courseId: string, batchEnd: Date | null): Promise<{ parents: BatchParent[]; lastEnd: Date | null }> {
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, status: EnrollmentStatus.ACTIVE, isLegacy: false },
    select: {
      id: true,
      parentId: true,
      student: { select: { firstName: true, visibleName: true } },
      cycles: { orderBy: { cycleNumber: "desc" }, take: 1, select: { endDate: true } },
    },
  });

  const parents: BatchParent[] = [];
  let lastEnd: Date | null = null;

  for (const e of enrollments) {
    const end = e.cycles[0]?.endDate;

    if (!end) continue;
    if (batchEnd && end.getTime() !== batchEnd.getTime()) continue;

    if (!lastEnd || end.getTime() > lastEnd.getTime()) lastEnd = end;

    parents.push({
      parentId: e.parentId,
      enrollmentId: e.id,
      studentName: e.student.visibleName || e.student.firstName,
    });
  }

  return { parents, lastEnd };
}

export interface AnswerGroupContinueInput {
  teacherId: string;
  continuationId: string;
  action: GroupContinueAction;
  /** CONTINUE only; defaults to the group's current size. */
  maxStudents?: unknown;
}

/** The Teacher's answer: continue (with a size), close, or "remind me later". */
export async function answerGroupContinuation(
  input: AnswerGroupContinueInput,
  now: Date = new Date(),
): Promise<{ action: GroupContinueAction }> {
  const row = await prisma.groupContinuation.findUnique({
    where: { id: input.continuationId },
    include: { course: { select: { id: true, courseTitle: true, groupMaxStudents: true, groupRegEndDate: true } } },
  });

  if (!row || row.teacherId !== input.teacherId) {
    throw new GroupContinueError("This question wasn't found.", 404);
  }

  if (row.decision !== GroupContinuationDecision.PENDING) {
    throw new GroupContinueError("You've already answered this one.", 409);
  }

  if (input.action === "LATER") {
    if (row.mustAnswerBy <= now) {
      throw new GroupContinueError(
        "The deadline for this question has passed — please answer Continue or Close.",
        409,
      );
    }

    const snoozed = await prisma.groupContinuation.updateMany({
      where: { id: row.id, decision: GroupContinuationDecision.PENDING },
      data: { remindAfter: nextReminderAt(now, row.mustAnswerBy) },
    });

    if (snoozed.count !== 1) throw new GroupContinueError("You've already answered this one.", 409);

    return { action: "LATER" };
  }

  if (input.action === "CONTINUE") {
    const size = parseGroupMaxStudents(input.maxStudents ?? row.course.groupMaxStudents);

    if (!size.ok) throw new GroupContinueError(size.error, 400);

    const seats = await countGroupSeats(row.courseId);

    if (size.value < seats) {
      throw new GroupContinueError(
        `${seats} student${seats === 1 ? "" : "s"} already hold a seat, so the group can't be smaller than ${seats}.`,
        409,
      );
    }

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.groupContinuation.updateMany({
        where: { id: row.id, decision: GroupContinuationDecision.PENDING },
        data: {
          decision: GroupContinuationDecision.CONTINUE,
          decidedAt: now,
          maxStudents: size.value,
          remindAfter: null,
        },
      });

      if (claimed.count !== 1) throw new GroupContinueError("You've already answered this one.", 409);

      await tx.course.update({ where: { id: row.courseId }, data: { groupMaxStudents: size.value } });
    });

    // Current parents get the first chance: renewal opens for them now.
    const { parents } = await listGroupParents(row.courseId, row.batchEndDate);

    await notifyGroupRenewalOpen({ parents, courseTitle: row.course.courseTitle });

    return { action: "CONTINUE" };
  }

  // CLOSE: ends the group. Every still-open batch question is closed with it.
  const todayDate = calendarDateToDate(todayInPlatformTz(now));

  await prisma.$transaction(async (tx) => {
    const closed = await tx.groupContinuation.updateMany({
      where: { courseId: row.courseId, decision: GroupContinuationDecision.PENDING },
      data: { decision: GroupContinuationDecision.CLOSE, decidedAt: now, remindAfter: null },
    });

    if (closed.count < 1) throw new GroupContinueError("You've already answered this one.", 409);

    // No new sign-ups from today on.
    const regEnd = row.course.groupRegEndDate;

    if (!regEnd || regEnd.getTime() > todayDate.getTime()) {
      await tx.course.update({ where: { id: row.courseId }, data: { groupRegEndDate: todayDate } });
    }
  });

  const { parents, lastEnd } = await listGroupParents(row.courseId, null);

  await notifyGroupClosing({
    parents,
    courseTitle: row.course.courseTitle,
    lastDayLabel: dayLabel(lastEnd ?? row.batchEndDate),
  });

  return { action: "CLOSE" };
}

/* ── Parent side: renewal and sign-up ────────────────────────────────── */

/**
 * Why a Parent can't renew a RECURRING group enrollment right now, or null.
 * `batchEnd` is the end date of the enrollment's latest cycle. Other courses
 * (individual, one-time groups) are never held.
 */
export async function getGroupRenewalHold(courseId: string, batchEnd: Date): Promise<GroupHoldState | null> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { type: true, groupKind: true },
  });

  if (!course || !isGroupType(course.type) || course.groupKind !== DbGroupKind.RECURRING) return null;

  const closed = await prisma.groupContinuation.findFirst({
    where: { courseId, decision: GroupContinuationDecision.CLOSE },
    select: { id: true },
  });

  if (closed) return "CLOSING";

  const find = () =>
    prisma.groupContinuation.findUnique({
      where: { courseId_batchEndDate: { courseId, batchEndDate: batchEnd } },
      select: { decision: true },
    });

  let row = await find();

  if (!row) {
    // A group that was running before this existed: create its question now.
    try {
      await ensureGroupContinuations({ courseId });
      row = await find();
    } catch (error) {
      console.error("Group continuation ensure error:", error);
    }
  }

  return row?.decision === GroupContinuationDecision.CONTINUE ? null : "WAITING_TEACHER";
}

/** True once the Teacher has closed this group: no renewals, no new sign-ups. */
export async function isGroupClosing(courseId: string): Promise<boolean> {
  const closed = await prisma.groupContinuation.findFirst({
    where: { courseId, decision: GroupContinuationDecision.CLOSE },
    select: { id: true },
  });

  return closed !== null;
}

/* ── Class day ───────────────────────────────────────────────────────── */

/**
 * The reason a group class can't be started yet, or null. A class on or after
 * the 4th-last class of a batch can't be held while the Teacher's "continue?"
 * answer for that batch is still missing.
 */
export async function getGroupClassStartBlock(session: {
  startsAt: Date | null;
  enrollment: { courseId: string; course: { type: string | null } };
}): Promise<string | null> {
  if (!session.startsAt || !isGroupType(session.enrollment.course.type)) return null;

  const { courseId } = session.enrollment;
  const startsAt = session.startsAt;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { groupKind: true, courseTitle: true },
  });

  if (!course || course.groupKind !== DbGroupKind.RECURRING) return null;

  try {
    await ensureGroupContinuations({ courseId });
  } catch (error) {
    console.error("Group continuation ensure error:", error);
  }

  const pending = await prisma.groupContinuation.findMany({
    where: {
      courseId,
      decision: GroupContinuationDecision.PENDING,
      mustAnswerBy: { lte: startsAt },
    },
    select: { batchEndDate: true },
  });

  const inBatch = pending.some((row) => {
    const dayAfterEnd = platformWallClockToUtc(addDays(dateToCalendarDate(row.batchEndDate), 1), "00:00");

    return startsAt < dayAfterEnd;
  });

  if (!inBatch) return null;

  return `Before this class can be held, tell us whether "${course.courseTitle ?? "this group"}" will continue. Open Group classes and answer "Continue this group?" — it is needed before the 4th-last class of the batch.`;
}

/* ── Daily sweep ─────────────────────────────────────────────────────── */

export interface GroupContinueSweepResult {
  prompted: number;
  reminded: number;
}

/**
 * Sends the first "continue?" notification once a question is due, and the
 * reminder when a "remind me later" runs out. Each is claimed with a
 * conditional update, so a re-run (or two schedulers) never double-sends.
 */
export async function runGroupContinueSweep(now: Date = new Date()): Promise<GroupContinueSweepResult> {
  await ensureGroupContinuations({}, now);

  const todayDate = calendarDateToDate(todayInPlatformTz(now));
  const result: GroupContinueSweepResult = { prompted: 0, reminded: 0 };

  const firstPrompts = await prisma.groupContinuation.findMany({
    where: {
      decision: GroupContinuationDecision.PENDING,
      askedAt: null,
      askFrom: { lte: todayDate },
      batchEndDate: { gte: todayDate },
    },
    include: { course: { select: { courseTitle: true } } },
    take: 500,
  });

  for (const row of firstPrompts) {
    try {
      const claimed = await prisma.groupContinuation.updateMany({
        where: { id: row.id, decision: GroupContinuationDecision.PENDING, askedAt: null },
        data: { askedAt: now },
      });

      if (claimed.count !== 1) continue;

      await notifyGroupContinuePrompt({
        teacherId: row.teacherId,
        courseTitle: row.course.courseTitle,
        batchEndLabel: dayLabel(row.batchEndDate),
      });
      result.prompted += 1;
    } catch (error) {
      console.error(`Group continue prompt failed for ${row.id}:`, error);
    }
  }

  const snoozed = await prisma.groupContinuation.findMany({
    where: {
      decision: GroupContinuationDecision.PENDING,
      remindAfter: { lte: now },
      batchEndDate: { gte: todayDate },
    },
    include: { course: { select: { courseTitle: true } } },
    take: 500,
  });

  for (const row of snoozed) {
    try {
      const claimed = await prisma.groupContinuation.updateMany({
        where: { id: row.id, decision: GroupContinuationDecision.PENDING, remindAfter: { lte: now } },
        data: { remindAfter: null, lastRemindedAt: now },
      });

      if (claimed.count !== 1) continue;

      await notifyGroupContinuePrompt({
        teacherId: row.teacherId,
        courseTitle: row.course.courseTitle,
        batchEndLabel: dayLabel(row.batchEndDate),
        reminder: true,
      });
      result.reminded += 1;
    } catch (error) {
      console.error(`Group continue reminder failed for ${row.id}:`, error);
    }
  }

  return result;
}
