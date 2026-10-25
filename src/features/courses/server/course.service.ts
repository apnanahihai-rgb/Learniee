import { prisma } from "@/lib/prisma";
import { sessionLengthForCourse } from "@/features/shared/utils/sessionLength";

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
  const { isIITian, standardPrice, price, isPriceCustomized } = priceCourse(input);

  return {
    category: input.category || null,
    timeSlot: input.timeSlot || null,

    subject: input.subject || null,
    grade: input.grade || null,
    board: input.board || null,
    experience: input.experience || null,

    duration: input.duration || null,
    type: input.type || null,
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

