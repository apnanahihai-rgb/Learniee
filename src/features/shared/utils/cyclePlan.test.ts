import { describe, it, expect } from "vitest";
import {
  buildCyclePlan,
  cycleDeadlineDate,
  customDateOffsets,
  customDatesFromOffsets,
  extendedDeadlineForLeave,
  getCyclePlanProblem,
  minSessionsForPlan,
  normalizeCustomDateKeys,
  priceForSessions,
  shiftCustomDateKeys,
} from "./cyclePlan";
import { parseDateKey, toDateKey } from "@/lib/platformTime";

function key(d: ReturnType<typeof parseDateKey>) {
  if (!d) throw new Error("bad date");
  return toDateKey(d);
}

function date(k: string) {
  const d = parseDateKey(k);
  if (!d) throw new Error("bad date " + k);
  return d;
}

describe("buildCyclePlan: cycle length", () => {
  it("monthly: 5 Mar ends 4 Apr", () => {
    const p = buildCyclePlan("2026-03-05", [1])!;
    expect(key(p.endDate)).toBe("2026-04-04");
    expect(key(p.nextCycleStart)).toBe("2026-04-05");
    expect(p.cycleLengthDays).toBe(31);
  });

  it("monthly: 31 Jan 2026 clamps and ends 27 Feb", () => {
    expect(key(buildCyclePlan("2026-01-31", [1])!.endDate)).toBe("2026-02-27");
  });

  it("monthly: 31 Jan 2028 (leap year) ends 28 Feb", () => {
    expect(key(buildCyclePlan("2028-01-31", [1])!.endDate)).toBe("2028-02-28");
  });

  it("weekly: 5 Mar ends 11 Mar, 7 days", () => {
    const p = buildCyclePlan("2026-03-05", [1], "WEEKLY")!;
    expect(key(p.endDate)).toBe("2026-03-11");
    expect(p.cycleLengthDays).toBe(7);
  });

  it("invalid start date returns null", () => {
    expect(buildCyclePlan("not-a-date", [1])).toBeNull();
  });
});

describe("buildCyclePlan: weekday sessions", () => {
  it("Mondays in 5 Mar - 4 Apr 2026 = 4 (9,16,23,30 Mar)", () => {
    const p = buildCyclePlan("2026-03-05", [1])!;
    expect(p.sessionDates.map(key)).toEqual([
      "2026-03-09",
      "2026-03-16",
      "2026-03-23",
      "2026-03-30",
    ]);
  });

  it("Thursdays = 5 (the start date itself counts)", () => {
    expect(buildCyclePlan("2026-03-05", [4])!.sessionCount).toBe(5);
  });

  it("all 7 days = 31 sessions", () => {
    expect(buildCyclePlan("2026-03-05", [0, 1, 2, 3, 4, 5, 6])!.sessionCount).toBe(31);
  });
});

describe("buildCyclePlan: custom dates", () => {
  it("duplicates collapse, out-of-window dates are counted invalid", () => {
    const p = buildCyclePlan("2026-03-05", [], "MONTHLY", [
      "2026-03-06",
      "2026-03-06",
      "2026-03-10",
      "2026-04-20",
    ])!;
    expect(p.isCustom).toBe(true);
    expect(p.sessionCount).toBe(2);
    expect(p.invalidCustomDateCount).toBe(1);
    expect(getCyclePlanProblem(p)).not.toBeNull();
  });

  it("fewer than the minimum gives a problem", () => {
    const p = buildCyclePlan("2026-03-05", [], "MONTHLY", ["2026-03-06", "2026-03-07"])!;
    expect(getCyclePlanProblem(p)).toMatch(/at least 4/);
  });

  it("enough valid dates gives no problem", () => {
    const p = buildCyclePlan("2026-03-05", [], "MONTHLY", [
      "2026-03-06",
      "2026-03-10",
      "2026-03-14",
      "2026-03-20",
    ])!;
    expect(getCyclePlanProblem(p)).toBeNull();
  });
});

describe("getCyclePlanProblem: weekday plans", () => {
  it("monthly with 3 sessions is not bookable", () => {
    // Thursdays only in a short window: use one weekday that gives < 4
    const p = buildCyclePlan("2026-03-05", [], "MONTHLY")!;
    expect(p.sessionCount).toBe(0);
    expect(getCyclePlanProblem(p)).not.toBeNull();
  });

  it("weekly minimum is lower than monthly", () => {
    expect(minSessionsForPlan("WEEKLY")).toBeLessThan(minSessionsForPlan("MONTHLY"));
    const p = buildCyclePlan("2026-03-05", [4], "WEEKLY")!;
    expect(getCyclePlanProblem(p)).toBeNull();
  });
});

describe("custom date helpers", () => {
  it("normalizeCustomDateKeys cleans junk", () => {
    expect(
      normalizeCustomDateKeys([" 2026-03-08 ", "2026-03-06", "2026-03-06", "xx", 5, null]),
    ).toEqual(["2026-03-06", "2026-03-08"]);
    expect(normalizeCustomDateKeys("nope")).toEqual([]);
  });

  it("offsets round trip", () => {
    const keys = ["2026-03-05", "2026-03-08", "2026-04-04"];
    const offsets = customDateOffsets("2026-03-05", keys);
    expect(offsets).toEqual([0, 3, 30]);
    expect(customDatesFromOffsets("2026-03-05", offsets)).toEqual(keys);
  });

  it("customDatesFromOffsets accepts 0-61 whole numbers only", () => {
    const out = customDatesFromOffsets("2026-03-05", [0, 61, 62, -1, 1.5, "3"]);
    expect(out).toHaveLength(2);
  });

  it("shiftCustomDateKeys keeps the shape of the month", () => {
    expect(
      shiftCustomDateKeys(["2026-03-05", "2026-03-08"], "2026-03-05", "2026-04-05"),
    ).toEqual(["2026-04-05", "2026-04-08"]);
  });
});

describe("deadlines", () => {
  it("cycle starting 5 Mar has day 45 on 18 Apr", () => {
    expect(key(cycleDeadlineDate(date("2026-03-05")))).toBe("2026-04-18");
  });

  it("leave ending before day 45: day 45 + 30 days", () => {
    expect(key(extendedDeadlineForLeave(date("2026-03-05"), date("2026-04-01")))).toBe(
      "2026-05-18",
    );
  });

  it("leave ending after day 45: leave end + 30 days", () => {
    expect(key(extendedDeadlineForLeave(date("2026-03-05"), date("2026-04-25")))).toBe(
      "2026-05-25",
    );
  });
});

describe("priceForSessions", () => {
  it("rate x count rounded to paise", () => {
    expect(priceForSessions(400, 5)).toBe(2000);
    expect(priceForSessions(333.33, 3)).toBe(999.99);
  });
});