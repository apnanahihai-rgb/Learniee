import { describe, expect, it } from "vitest";
import { calculateTeacherRateShare, splitMonthlyRate } from "./teacherRateShare";

describe("calculateTeacherRateShare", () => {
  it("splits 70/30 on whole rupees", () => {
    const r = calculateTeacherRateShare({ ratePerSession: 500, sessionsPerMonth: 8, noOfMonths: 2 });
    expect(r.monthlyRate).toBe(4000);
    expect(r.monthlyTeacherPay).toBe(2800);
    expect(r.monthlyPlatformProfit).toBe(1200);
    expect(r.totalAmount).toBe(8000);
  });
  it("treats junk input as 0", () => {
    const r = calculateTeacherRateShare({ ratePerSession: -5, sessionsPerMonth: NaN, noOfMonths: 1 });
    expect(r.monthlyRate).toBe(0);
  });
});

describe("splitMonthlyRate: parts sum to the total", () => {
  it("whole rupees always sum", () => {
    for (let n = 0; n <= 5000; n += 7) {
      const r = splitMonthlyRate(n, 1);
      expect(r.monthlyTeacherPay + r.monthlyPlatformProfit).toBeCloseTo(n, 2);
    }
  });
  // KNOWN BUG (bug log Oct 21): paise amounts can drift 1 paisa (1.05 -> 0.74 + 0.32).
  // Remove `.fails` once profits = total - teacherPay.
  it.fails("paise amounts sum exactly", () => {
    const r = splitMonthlyRate(1.05, 1);
    expect(Math.round((r.monthlyTeacherPay + r.monthlyPlatformProfit) * 100)).toBe(105);
  });
});