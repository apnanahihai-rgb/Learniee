import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** Empties every table (never touches _prisma_migrations). Test DB only: tests/setup.ts blocks anything else. */
export async function resetDb() {
  const rows = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  );
  if (rows.length === 0) return;
  const list = rows.map((r) => `"public"."${r.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

const uid = () => randomUUID().replace(/-/g, "").slice(0, 12);
const utcMidnight = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

export interface SessionFixtureOptions {
  /** Class start; default 3 h ago. */
  startsAt?: Date;
  /** Class length in minutes; default 60. */
  lengthMinutes?: number;
  teacherStartedAt?: Date | null;
  teacherEndedAt?: Date | null;
  studentJoinedAt?: Date | null;
}

/** Parent + student + approved teacher + course + ACTIVE cycle-model enrollment (monthly, 4 sessions) + one SCHEDULED session. */
export async function createSessionFixture(opts: SessionFixtureOptions = {}) {
  const now = new Date();
  const startsAt = opts.startsAt ?? new Date(now.getTime() - 3 * 3_600_000);
  const lengthMinutes = opts.lengthMinutes ?? 60;
  const endsAt = new Date(startsAt.getTime() + lengthMinutes * 60_000);
  const s = uid();

  const parent = await prisma.parentProfile.create({
    data: { cognitoSub: `p-${s}`, firstName: "Pat", lastName: "Parent", phone: "9000000000", email: `p-${s}@test.local` },
  });
  const student = await prisma.student.create({
    data: { parentId: parent.id, firstName: "Sam", lastName: "Student" },
  });
  const teacher = await prisma.teacher.create({
    data: { cognitoId: `t-${s}`, email: `t-${s}@test.local`, firstName: "Tia", lastName: "Teacher", approvalStatus: "APPROVED" },
  });
  const course = await prisma.course.create({ data: { teacherId: teacher.id } });

  const cycleStart = utcMidnight(addDays(startsAt, -2));
  const cycleEnd = addDays(cycleStart, 29);

  const enrollment = await prisma.enrollment.create({
    data: {
      studentId: student.id,
      parentId: parent.id,
      teacherId: teacher.id,
      courseId: course.id,
      sessionsPerMonth: 4,
      ratePerSession: 500,
      monthlyRate: 2000,
      totalAmount: 2000,
      cycleStartDate: cycleStart,
      dueDate: addDays(cycleEnd, 1),
      amountPaid: 2000,
      razorpayOrderId: `order_${s}`,
      razorpayPaymentId: `pay_${s}`,
      status: "ACTIVE",
      isLegacy: false,
      scheduleDays: [0, 1, 2, 3, 4, 5, 6],
      scheduleTime: "10:00",
    },
  });
  const cycle = await prisma.enrollmentCycle.create({
    data: {
      enrollmentId: enrollment.id,
      cycleNumber: 1,
      startDate: cycleStart,
      endDate: cycleEnd,
      sessionCount: 4,
      ratePerSession: 500,
      price: 2000,
    },
  });
  const session = await prisma.classSession.create({
    data: {
      enrollmentId: enrollment.id,
      teacherId: teacher.id,
      studentId: student.id,
      parentId: parent.id,
      scheduledDate: utcMidnight(startsAt),
      scheduledTime: "10:00",
      status: "SCHEDULED",
      cycleId: cycle.id,
      sessionNumber: 1,
      startsAt,
      endsAt,
      lengthMinutes,
      teacherStartedAt: opts.teacherStartedAt ?? null,
      teacherEndedAt: opts.teacherEndedAt ?? null,
      studentJoinedAt: opts.studentJoinedAt ?? null,
    },
  });

  return { parent, student, teacher, course, enrollment, cycle, session, startsAt, endsAt };
}