/**
 * Teacher/platform revenue-share math — single source of truth for the
 * 70/30 split resolved in `06-OPEN-DECISIONS.md` #1 ("Profits" = 30% of
 * Monthly_rate, teacher keeps 70% as Monthly_teacher_pay).
 *
 * The same 0.7/0.3 constants already exist server-side in
 * `tuitionLedger.service.ts` and `accounts/server/export.service.ts` for
 * the real Tuition Ledger. This file is a plain, dependency-free copy
 * (no `server-only` import, no Prisma) so it can also run client-side —
 * it powers the Teacher-facing "what would I earn" preview at
 * `/teacher/rate-calculator`, which has nothing to persist and isn't
 * part of the Ledger itself.
 */

export const TEACHER_SHARE = 0.7; // 06-OPEN-DECISIONS.md #1: teacher keeps 70%
export const PLATFORM_SHARE = 0.3; // Profits = 30% of Monthly_rate

// Matches the live session-count rule in `enrollment.service.ts`
// (06-OPEN-DECISIONS.md #25 — min 4, any integer, capped at 31).
export const MIN_SESSIONS_PER_MONTH = 4;
export const MAX_SESSIONS_PER_MONTH = 31;

export interface RateShareInput {
  ratePerSession: number;
  sessionsPerMonth: number;
  noOfMonths: number;
}

export interface RateShareBreakdown {
  ratePerSession: number;
  sessionsPerMonth: number;
  noOfMonths: number;
  monthlyRate: number;
  monthlyTeacherPay: number;
  monthlyPlatformProfit: number;
  totalAmount: number;
  totalTeacherPay: number;
  totalPlatformProfit: number;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function positiveOrZero(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Full "what-if" calculation from raw per-session rate — used by the
 * manual calculator on the Rate Calculator page.
 */
export function calculateTeacherRateShare({
  ratePerSession,
  sessionsPerMonth,
  noOfMonths,
}: RateShareInput): RateShareBreakdown {
  const safeRate = positiveOrZero(ratePerSession);
  const safeSessions = positiveOrZero(sessionsPerMonth);
  const safeMonths = positiveOrZero(noOfMonths);

  const monthlyRate = round2(safeRate * safeSessions);
  const monthlyTeacherPay = round2(monthlyRate * TEACHER_SHARE);
  const monthlyPlatformProfit = round2(monthlyRate * PLATFORM_SHARE);

  return {
    ratePerSession: safeRate,
    sessionsPerMonth: safeSessions,
    noOfMonths: safeMonths,
    monthlyRate,
    monthlyTeacherPay,
    monthlyPlatformProfit,
    totalAmount: round2(monthlyRate * safeMonths),
    totalTeacherPay: round2(monthlyTeacherPay * safeMonths),
    totalPlatformProfit: round2(monthlyPlatformProfit * safeMonths),
  };
}

/**
 * Same split, starting from an already-known `monthlyRate` (e.g. a real
 * Enrollment's stored `monthlyRate`) instead of recomputing it from a
 * per-session rate. Used to show the 70/30 breakdown for a teacher's
 * actual enrollments.
 */
export function splitMonthlyRate(monthlyRate: number, noOfMonths: number) {
  const safeMonthly = positiveOrZero(monthlyRate);
  const safeMonths = positiveOrZero(noOfMonths);

  const monthlyTeacherPay = round2(safeMonthly * TEACHER_SHARE);
  const monthlyPlatformProfit = round2(safeMonthly * PLATFORM_SHARE);

  return {
    monthlyRate: safeMonthly,
    monthlyTeacherPay,
    monthlyPlatformProfit,
    totalTeacherPay: round2(monthlyTeacherPay * safeMonths),
    totalPlatformProfit: round2(monthlyPlatformProfit * safeMonths),
  };
}
