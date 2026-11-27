import { EnrollmentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sessionLengthForCourse } from "@/features/shared/utils/sessionLength";
import { isGroupType, parseGroupMaxStudents, parseGroupSchedule } from "@/features/courses/utils/groupClass";
import { calendarDateToDate, parseDateKey } from "@/lib/platformTime";

export interface CourseFormInput {
  category: string;
  timeSlot: string;

  subject: string;
  /** Typed subject name when `subject` is "Other" (resolved by the route). */
  subjectOther?: string;
  grade: string;
  board: string;
  experience: string;

  duration: string;
  type: string;
  language: string;
  frequency: string;
  frequencyCustom?: string;

  courseTitle: string;
  objective: string;
  description: string;

  modules: string;
  moduleCustom?: string;
  courseTags: string;
  price: string;
  isIITian?: boolean;

  certificateEnabled?: boolean;
  certificateSessionThreshold?: string;

  /** Group classes only (type "Group"); ignored for Individual. */
  groupMaxStudents?: string | number;
  /** Group classes only: price for one cycle, weekly days (0 = Sun), time (IST), mode and dates. */
  groupPricePerCycle?: string | number;
  groupDays?: number[];
  groupTime?: string;
  groupMode?: string;
  groupJoinMode?: string;
  groupStartDate?: string;
  groupEndDate?: string;

  thumbnailKey?: string;
  introVideoKey?: string;

  /** Set when this course is the listing for an accepted class-request vacancy. */
  classRequestId?: string;
}

/**
 * Course pricing (Oct 2026): teachers set their own price per session —
 * there are no fixed per-grade or IITian rates any more. The price is
 * required and must be a positive number. `standardPrice` is no longer
 * computed (null) and `isPriceCustomized` is always false, so the Admin
 * review screen no longer shows a "non-standard price" warning; Admin
 * approval itself is unchanged. The IITian flag is still derived
 * server-side by the route and stored as before.
 */
function priceCourse(input: CourseFormInput) {
  const isIITian = Boolean(input.isIITian);
  const price = Number(input.price);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Price per session must be a positive number.");
  }

  return { isIITian, standardPrice: null, price, isPriceCustomized: false };
}

function buildCourseData(input: CourseFormInput) {
  let groupMaxStudents: number | null = null;
  let groupFields: {
    groupPricePerCycle: number | null;
    groupDays: number[];
    groupTime: string | null;
    groupMode: "TIME_BOUND" | "OPEN" | null;
    groupJoinMode: "MONTHLY_FIXED" | "ANYTIME" | null;
    groupStartDate: Date | null;
    groupEndDate: Date | null;
  } = {
    groupPricePerCycle: null,
    groupDays: [],
    groupTime: null,
    groupMode: null,
    groupJoinMode: null,
    groupStartDate: null,
    groupEndDate: null,
  };
  let priceInput = input;

  if (isGroupType(input.type)) {
    const group = parseGroupMaxStudents(input.groupMaxStudents);

    if (!group.ok) throw new Error(group.error);

    groupMaxStudents = group.value;

    const schedule = parseGroupSchedule(input);

    if (!schedule.ok) throw new Error(schedule.error);

    const { value } = schedule;
    const start = parseDateKey(value.startDate);
    const end = parseDateKey(value.endDate);

    groupFields = {
      groupPricePerCycle: value.pricePerCycle,
      groupDays: value.days,
      groupTime: value.time,
      groupMode: value.mode,
      groupJoinMode: value.joinMode,
      groupStartDate: start ? calendarDateToDate(start) : null,
      groupEndDate: end ? calendarDateToDate(end) : null,
    };

    // `price` stays a per-session figure (derived) so existing cards keep working.
    priceInput = { ...input, price: String(value.pricePerSession) };
  }

  const { isIITian, standardPrice, price, isPriceCustomized } = priceCourse(priceInput);

  return {
    category: input.category || null,
    timeSlot: input.timeSlot || null,

    subject: input.subject || null,
    grade: input.grade || null,
    board: input.board || null,
    experience: input.experience || null,

    duration: input.duration || null,
    type: input.type || null,
    groupMaxStudents,
    ...groupFields,
    language: input.language || null,
    frequency: input.frequency || null,

    courseTitle: input.courseTitle || null,
    // `rating` is deliberately not set here — see the doc-comment on
    // Course.rating in schema.prisma. It's never teacher-entered;
    // the rating shown to Parents is computed live from Reviews.
    objective: input.objective || null,
    description: input.description || null,

    modules: input.modules || null,
    courseTags: input.courseTags || null,
    price,
    isIITian,
    standardPrice,
    isPriceCustomized,

    certificateEnabled: Boolean(input.certificateEnabled),
    certificateSessionThreshold:
      input.certificateEnabled && input.certificateSessionThreshold
        ? Number(input.certificateSessionThreshold)
        : null,

    thumbnailKey: input.thumbnailKey || null,
    introVideoKey: input.introVideoKey || null,
  };
}

export async function createCourse(
  teacherId: string,
  input: CourseFormInput,
) {
  const data = buildCourseData(input);

  return prisma.course.create({
    data: {
      teacherId,
      ...data,
      status: "UNDER_REVIEW",
    },
  });
}

export async function getTeacherCourses(
  teacherId: string,
) {
  return prisma.course.findMany({
    where: {
      teacherId,
      status: {
        in: ["APPROVED", "UNDER_REVIEW"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * The teacher's courses plus how many students are learning each one right
 * now (ACTIVE enrollments only). Used by the Courses page cards. Both queries
 * are scoped by `teacherId` — that `where` is the access rule.
 */
export async function getTeacherCoursesWithActiveCounts(teacherId: string) {
  const courses = await getTeacherCourses(teacherId);

  if (courses.length === 0) return [];

  const grouped = await prisma.enrollment.groupBy({
    by: ["courseId"],
    where: {
      teacherId,
      status: EnrollmentStatus.ACTIVE,
      courseId: { in: courses.map((c) => c.id) },
    },
    _count: { _all: true },
  });

  const counts = new Map(grouped.map((g) => [g.courseId, g._count._all]));

  return courses.map((course) => ({
    ...course,
    activeStudents: counts.get(course.id) ?? 0,
  }));
}

