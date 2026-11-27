import {
    buildCyclePlan,
    getCyclePlanProblem,
    isStartDateInPast,
    normalizeCustomDateKeys,
    parsePlanType,
    priceForSessions,
    weekdaysOfDateKeys
} from "@/features/shared/utils/cyclePlan";
import { getTeacherAvailability } from "@/features/shared/server/teacherAvailability.service";
import { fitsAvailability } from "@/features/shared/utils/availability";
import { WEEKDAY_LABELS_FULL } from "@/features/shared/utils/weekdays";
import { sessionLengthForCourse } from "@/features/shared/utils/sessionLength";
import {
  ageFitsGroup,
  groupLastRegistrationKey,
  groupRegistrationState,
  isGroupType,
  resolveGroupStartDate,
  studentAgeYears,
} from "@/features/courses/utils/groupClass";
import {
    isInternationalParent,
    priceWithInternationalSurcharge,
} from "@/lib/internationalPayments";
import {
    calendarDateToDate,
    isValidTimeOfDay,
    toDateKey,
    todayInPlatformTz,
} from "@/lib/platformTime";
import { prisma } from "@/lib/prisma";
import { countGroupSeats, isStudentInGroup } from './group';
import { CreateEnrollmentInput, EnrollmentError, MAX_NO_OF_MONTHS, MAX_SESSIONS_PER_MONTH, MIN_SESSIONS_PER_MONTH, PriceOptions, PricedEnrollment, SCHEDULE_TIME_PATTERN } from './types';

/**
 * Legacy pricing — All the validation + pricing that used to live inline in
 * `createEnrollment()`. Pulled out so both the payment-order step
 * and the payment-verify step run the exact same server-side
 * calculation — the client's price preview is never trusted for the
 * actual charge amount.
 *
 * Pricing formula (flagged back in 06-OPEN-DECISIONS.md as an
 * assumption pending sign-off — see schema.prisma's Enrollment
 * doc-comment for the full reasoning):
 *   ratePerSession = Course.price
 *   monthlyRate    = ratePerSession * sessionsPerMonth
 *   totalAmount    = monthlyRate * noOfMonths
 *   dueDate        = cycleStartDate + 1 month
 */
async function priceLegacyEnrollment(
  parentId: string,
  input: CreateEnrollmentInput,
): Promise<PricedEnrollment> {
  const sessionsPerMonth = input.sessionsPerMonth as number;

  if (
    !Number.isInteger(sessionsPerMonth) ||
    sessionsPerMonth < MIN_SESSIONS_PER_MONTH ||
    sessionsPerMonth > MAX_SESSIONS_PER_MONTH
  ) {
    throw new EnrollmentError(
      `sessionsPerMonth must be a whole number between ${MIN_SESSIONS_PER_MONTH} and ${MAX_SESSIONS_PER_MONTH}.`,
    );
  }

  const noOfMonths = input.noOfMonths ?? 1;

  if (!Number.isInteger(noOfMonths) || noOfMonths < 1 || noOfMonths > MAX_NO_OF_MONTHS) {
    throw new EnrollmentError(
      `noOfMonths must be a whole number between 1 and ${MAX_NO_OF_MONTHS}.`,
    );
  }

  const scheduleDays = Array.from(new Set(input.scheduleDays ?? [])).sort(
    (a, b) => a - b,
  );

  if (
    scheduleDays.length === 0 ||
    scheduleDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
  ) {
    throw new EnrollmentError(
      "Pick at least one day of the week for classes.",
    );
  }

  if (
    !input.scheduleTime ||
    !SCHEDULE_TIME_PATTERN.test(input.scheduleTime)
  ) {
    throw new EnrollmentError(
      "Pick a valid class time (HH:mm).",
    );
  }

  // Same not-found-vs-not-yours guard used by
  // demoCoupon.service.ts / student.service.ts.
  const student = await prisma.student.findFirst({
    where: { id: input.studentId, parentId },
    select: { id: true },
  });

  if (!student) {
    throw new EnrollmentError(
      "This child profile doesn't belong to your account.",
      404,
    );
  }

  const course = await prisma.course.findFirst({
    where: {
      id: input.courseId,
      teacherId: input.teacherId,
      status: "APPROVED",
    },
    select: { id: true, subject: true, price: true },
  });

  if (!course) {
    throw new EnrollmentError(
      "Course not found, or isn't open for enrollment yet.",
      404,
    );
  }

  if (course.price == null) {
    throw new EnrollmentError(
      "This course doesn't have a rate set yet — ask the teacher to add one before enrolling.",
    );
  }

  const cycleStartDate = input.cycleStartDate
    ? new Date(input.cycleStartDate)
    : new Date();

  if (Number.isNaN(cycleStartDate.getTime())) {
    throw new EnrollmentError(
      "That doesn't look like a valid start date — pick again.",
    );
  }

  const dueDate = new Date(cycleStartDate);
  dueDate.setMonth(dueDate.getMonth() + 1);

  const ratePerSession = Number(course.price);
  const monthlyRate = ratePerSession * sessionsPerMonth;
  const totalAmount = monthlyRate * noOfMonths;

  const subject = (input.subject ?? course.subject ?? "").trim() || null;

  // Parent already confirmed to exist (the student lookup above is
  // scoped to `parentId`) — fetch the two fields that decide whether
  // the international surcharge applies. See
  // src/lib/internationalPayments.ts for the detection logic and
  // why this is a self-declared signal, not real-time card detection.
  const parent = await prisma.parentProfile.findUnique({
    where: { id: parentId },
    select: { nriOrIndian: true, country: true },
  });

  const { isInternationalPayment, surchargeAmount, gstAmount, amountPayable } =
    priceWithInternationalSurcharge(
      totalAmount,
      parent ? isInternationalParent(parent) : false,
    );

  return {
    studentId: input.studentId,
    subject,
    sessionsPerMonth,
    noOfMonths,
    ratePerSession,
    monthlyRate,
    totalAmount,
    isInternationalPayment,
    internationalSurchargeAmount: surchargeAmount,
    gstAmount,
    transactionChargeAmount: 0,
    amountPayable,
    cycleStartDate,
    dueDate,
    scheduleDays,
    scheduleTime: input.scheduleTime,
    planType: "MONTHLY",
    customDateKeys: [],
    model: "LEGACY",
    cycleStartKey: null,
    cycleEndDate: null,
    sessionLengthMinutes: null,
  };
}
/**
 * Group-class pricing (Nov 2026). A group course fixes its own weekdays,
 * time, start rule and price, so none of that is taken from the request:
 *
 *   schedule       = Course.groupDays / groupTime (always a MONTHLY cycle)
 *   start date     = TIME_BOUND: Course.groupStartDate (joining closes once
 *                    it has passed); OPEN: the parent's pick, not in the past
 *   ratePerSession = Course.price — charged PER SESSION, like any course
 *   totalAmount    = ratePerSession x the cycle's session count
 *
 * With `options.enforceGroupRules` (order creation only) it also refuses a
 * full group and a student who already holds a seat. Verify and the webhook
 * skip those checks: the money is already taken by then.
 */
async function priceGroupEnrollment(
  parentId: string,
  input: CreateEnrollmentInput,
  options: PriceOptions,
  course: {
    id: string;
    subject: string | null;
    duration: string | null;
    groupMaxStudents: number | null;
    price: { toString(): string } | null;
    groupDays: number[];
    groupTime: string | null;
    groupMode: "TIME_BOUND" | "OPEN" | null;
    groupJoinMode: "MONTHLY_FIXED" | "ANYTIME" | null;
    groupStartDate: Date | null;
    groupEndDate: Date | null;
    groupAgeMin: number | null;
    groupAgeMax: number | null;
    groupRegStartDate: Date | null;
    groupRegEndDate: Date | null;
  },
): Promise<PricedEnrollment> {
  const groupPrice = course.price == null ? NaN : Number(course.price);
  const scheduleDays = [...new Set(course.groupDays)].sort((a, b) => a - b);

  if (
    !Number.isFinite(groupPrice) ||
    groupPrice <= 0 ||
    scheduleDays.length === 0 ||
    !isValidTimeOfDay(course.groupTime) ||
    !course.groupMode
  ) {
    throw new EnrollmentError(
      "This group class isn't fully set up yet — please check back soon.",
      409,
    );
  }

  const scheduleTime = course.groupTime as string;
  const today = todayInPlatformTz();
  const toKey = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

  const resolved = resolveGroupStartDate({
    mode: course.groupMode,
    joinMode: course.groupJoinMode,
    groupStartDate: toKey(course.groupStartDate),
    groupEndDate: toKey(course.groupEndDate),
    requested: input.cycleStartDate?.trim() || null,
    today,
    // Mid-way joining: refuses a start date that leaves fewer than 4 classes.
    days: scheduleDays,
    // Verify / webhook: the money is taken, keep the date stamped on the order.
    trustRequested: !options.enforceStartNotPast,
  });

  if (!resolved.ok) {
    throw new EnrollmentError(resolved.error, resolved.status);
  }

  const startKey = resolved.startKey;

  // A one-time group ends on the teacher's end date: the cycle stops there, so
  // a student joining mid-way pays only for the classes that are left.
  const plan = buildCyclePlan(startKey, scheduleDays, "MONTHLY", [], toKey(course.groupEndDate));

  if (!plan) {
    throw new EnrollmentError(
      "That doesn't look like a valid start date — pick again.",
    );
  }

  if (options.enforceStartNotPast && isStartDateInPast(plan.startDate, today)) {
    // Only groups from before the joining option existed close once started.
    const closedOnStart = course.groupMode === "TIME_BOUND" && !course.groupJoinMode;

    throw new EnrollmentError(
      closedOnStart
        ? "This group has already started, so new students can't join."
        : "The start date can't be in the past.",
      closedOnStart ? 409 : 400,
    );
  }

  const planProblem = getCyclePlanProblem(plan);

  if (planProblem) {
    throw new EnrollmentError(planProblem);
  }

  const student = await prisma.student.findFirst({
    where: { id: input.studentId, parentId },
    select: { id: true, age: true, dateOfBirth: true },
  });

  if (!student) {
    throw new EnrollmentError(
      "This child profile doesn't belong to your account.",
      404,
    );
  }

  if (options.enforceGroupRules) {
    // Registration and age rules apply to new sign-ups only (order creation);
    // verify / webhook skip them because the money is already taken.
    const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
    // Registration closes on the teacher's end date, or earlier — the day
    // before the last 4 classes — for a one-time group with mid-way joining.
    const registration = groupRegistrationState(
      day(course.groupRegStartDate),
      groupLastRegistrationKey({
        days: scheduleDays,
        mode: course.groupMode,
        joinMode: course.groupJoinMode,
        startDate: day(course.groupStartDate),
        endDate: day(course.groupEndDate),
        regEndDate: day(course.groupRegEndDate),
      }),
      today,
    );

    if (registration === "NOT_OPEN") {
      throw new EnrollmentError("Registration for this group hasn't opened yet.", 409);
    }

    if (registration === "CLOSED") {
      throw new EnrollmentError("Registration for this group has closed.", 409);
    }

    if (!ageFitsGroup(studentAgeYears(student, today), course.groupAgeMin, course.groupAgeMax)) {
      throw new EnrollmentError(
        `This group is for ages ${course.groupAgeMin}–${course.groupAgeMax}, so this child can't join.`,
        409,
      );
    }

    if (await isStudentInGroup(course.id, input.studentId)) {
      throw new EnrollmentError("This child is already in this group.", 409);
    }

    if (
      course.groupMaxStudents != null &&
      (await countGroupSeats(course.id)) >= course.groupMaxStudents
    ) {
      throw new EnrollmentError("This group is full.", 409);
    }
  }

  const ratePerSession = Math.round(groupPrice * 100) / 100;
  const totalAmount = priceForSessions(ratePerSession, plan.sessionCount);
  const subject = (input.subject ?? course.subject ?? "").trim() || null;

  const parent = await prisma.parentProfile.findUnique({
    where: { id: parentId },
    select: { nriOrIndian: true, country: true },
  });

  const { isInternationalPayment, surchargeAmount, gstAmount, amountPayable } =
    priceWithInternationalSurcharge(
      totalAmount,
      parent ? isInternationalParent(parent) : false,
    );

  return {
    studentId: input.studentId,
    subject,
    sessionsPerMonth: plan.sessionCount,
    noOfMonths: 1,
    ratePerSession,
    monthlyRate: totalAmount,
    totalAmount,
    isInternationalPayment,
    internationalSurchargeAmount: surchargeAmount,
    gstAmount,
    transactionChargeAmount: 0,
    amountPayable,
    cycleStartDate: calendarDateToDate(plan.startDate),
    dueDate: calendarDateToDate(plan.nextCycleStart),
    scheduleDays,
    scheduleTime,
    planType: "MONTHLY",
    customDateKeys: [],
    model: "CYCLE_V1",
    cycleStartKey: toDateKey(plan.startDate),
    cycleEndDate: calendarDateToDate(plan.endDate),
    sessionLengthMinutes:
      options.lockedSessionLengthMinutes ??
      sessionLengthForCourse(course.duration),
  };
}
/**
 * Cycle-model pricing (Part 1A). Same server-side-only trust rules
 * as the legacy function: the client's preview is never used for the
 * charge.
 *
 *   plan           = buildCyclePlan(startDate, weekdays, planType, customDates)   // cyclePlan.ts
 *   sessionCount   = weekdays matching dates in the cycle, or the
 *                    hand-picked dates for the "Complete month plan"  (min 4)
 *   ratePerSession = Course.price
 *   totalAmount    = ratePerSession x sessionCount
 *   dueDate        = day after the cycle ends (next cycle start)
 *
 * `sessionsPerMonth` is set to the cycle's session count and
 * `noOfMonths` to 1, so the ledger, rate calculator and every
 * screen that reads those two fields keep working unchanged.
 */
async function priceCycleEnrollment(
  parentId: string,
  input: CreateEnrollmentInput,
  options: PriceOptions,
): Promise<PricedEnrollment> {
  // Group classes fix their own schedule, start rule and price.
  const groupCourse = await prisma.course.findFirst({
    where: { id: input.courseId, teacherId: input.teacherId, status: "APPROVED" },
    select: {
      id: true,
      type: true,
      subject: true,
      duration: true,
      groupMaxStudents: true,
      price: true,
      groupDays: true,
      groupTime: true,
      groupMode: true,
      groupJoinMode: true,
      groupStartDate: true,
      groupEndDate: true,
      groupAgeMin: true,
      groupAgeMax: true,
      groupRegStartDate: true,
      groupRegEndDate: true,
    },
  });

  if (groupCourse && isGroupType(groupCourse.type)) {
    return priceGroupEnrollment(parentId, input, options, groupCourse);
  }

  // "Complete month plan": exact dates. When present they replace the
  // weekday pattern and the weekdays are derived from them below.
  const customDateKeys = normalizeCustomDateKeys(input.customDates);
  const isCustom = customDateKeys.length > 0;

  let scheduleDays = Array.from(new Set(input.scheduleDays ?? [])).sort(
    (a, b) => a - b,
  );

  if (isCustom) {
    scheduleDays = weekdaysOfDateKeys(customDateKeys);
  } else if (
    scheduleDays.length === 0 ||
    scheduleDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
  ) {
    throw new EnrollmentError("Pick at least one day of the week for classes.");
  }

  if (!isValidTimeOfDay(input.scheduleTime)) {
    throw new EnrollmentError("Pick a valid class time (HH:mm).");
  }

  const today = todayInPlatformTz();
  const startKey = input.cycleStartDate?.trim() || toDateKey(today);
  const planType = parsePlanType(input.planType);
  const plan = buildCyclePlan(startKey, scheduleDays, planType, customDateKeys);

  if (!plan) {
    throw new EnrollmentError(
      "That doesn't look like a valid start date — pick again.",
    );
  }

  if (options.enforceStartNotPast && isStartDateInPast(plan.startDate, today)) {
    throw new EnrollmentError("The start date can't be in the past.");
  }

  const planProblem = getCyclePlanProblem(plan);

  if (planProblem) {
    throw new EnrollmentError(planProblem);
  }

  const student = await prisma.student.findFirst({
    where: { id: input.studentId, parentId },
    select: { id: true },
  });

  if (!student) {
    throw new EnrollmentError(
      "This child profile doesn't belong to your account.",
      404,
    );
  }

  const course = await prisma.course.findFirst({
    where: {
      id: input.courseId,
      teacherId: input.teacherId,
      status: "APPROVED",
    },
    select: { id: true, subject: true, price: true, duration: true },
  });

  if (!course) {
    throw new EnrollmentError(
      "Course not found, or isn't open for enrollment yet.",
      404,
    );
  }

  if (options.enforceAvailability) {
    const slots = await getTeacherAvailability(input.teacherId);

    if (slots.length === 0) {
      throw new EnrollmentError(
        "This teacher hasn't set their availability yet — please check back soon.",
        409,
      );
    }

    const lengthMinutes =
      options.lockedSessionLengthMinutes ??
      sessionLengthForCourse(course.duration);

    const outside = scheduleDays.filter(
      (day) => !fitsAvailability(slots, day, input.scheduleTime, lengthMinutes),
    );

    if (outside.length > 0) {
      const names = outside.map((d) => WEEKDAY_LABELS_FULL[d]).join(", ");
      throw new EnrollmentError(
        `The teacher isn't available at that time on ${names}. Pick a day and time inside their available timings.`,
        409,
      );
    }
  }

  if (course.price == null) {
    throw new EnrollmentError(
      "This course doesn't have a rate set yet — ask the teacher to add one before enrolling.",
    );
  }

  const ratePerSession = Number(course.price);
  const totalAmount = priceForSessions(ratePerSession, plan.sessionCount);
  const subject = (input.subject ?? course.subject ?? "").trim() || null;

  const parent = await prisma.parentProfile.findUnique({
    where: { id: parentId },
    select: { nriOrIndian: true, country: true },
  });

  const { isInternationalPayment, surchargeAmount, gstAmount, amountPayable } =
    priceWithInternationalSurcharge(
      totalAmount,
      parent ? isInternationalParent(parent) : false,
    );

  return {
    studentId: input.studentId,
    subject,
    sessionsPerMonth: plan.sessionCount,
    noOfMonths: 1,
    ratePerSession,
    monthlyRate: totalAmount,
    totalAmount,
    isInternationalPayment,
    internationalSurchargeAmount: surchargeAmount,
    gstAmount,
    transactionChargeAmount: 0,
    amountPayable,
    cycleStartDate: calendarDateToDate(plan.startDate),
    dueDate: calendarDateToDate(plan.nextCycleStart),
    scheduleDays,
    scheduleTime: input.scheduleTime,
    planType,
    customDateKeys: plan.isCustom ? plan.sessionDates.map(toDateKey) : [],
    model: "CYCLE_V1",
    cycleStartKey: toDateKey(plan.startDate),
    cycleEndDate: calendarDateToDate(plan.endDate),
    sessionLengthMinutes:
      options.lockedSessionLengthMinutes ??
      sessionLengthForCourse(course.duration),
  };
}
export function priceEnrollment(
  parentId: string,
  input: CreateEnrollmentInput,
  options: PriceOptions,
): Promise<PricedEnrollment> {
  return options.model === "CYCLE_V1"
    ? priceCycleEnrollment(parentId, input, options)
    : priceLegacyEnrollment(parentId, input);
}
