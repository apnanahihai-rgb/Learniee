import { describe, it, expect } from "vitest";
import {
  addDays,
  addOneMonthClamped,
  calendarDateToDate,
  compareDates,
  dateToCalendarDate,
  daysBetween,
  daysInMonth,
  isValidTimeOfDay,
  parseDateKey,
  platformWallClockToUtc,
  todayInPlatformTz,
  toDateKey,
  weekdayOf,
} from "./platformTime";

function date(k: string) {
  const d = parseDateKey(k);
  if (!d) throw new Error("bad date " + k);
  return d;
}

describe("parseDateKey / toDateKey", () => {
  it("round trips a valid date", () => {
    expect(toDateKey(date("2026-03-05"))).toBe("2026-03-05");
  });

  it.each(["2026-02-30", "2026-13-01", "2026-00-10", "2026-3-5", "05-03-2026", "banana", ""])(
    "rejects %j",
    (v) => {
      expect(parseDateKey(v)).toBeNull();
    },
  );

  it("rejects null / undefined, trims spaces, knows leap years", () => {
    expect(parseDateKey(null)).toBeNull();
    expect(parseDateKey(undefined)).toBeNull();
    expect(parseDateKey(" 2026-03-05 ")).not.toBeNull();
    expect(parseDateKey("2028-02-29")).not.toBeNull();
    expect(parseDateKey("2026-02-29")).toBeNull();
  });
});

describe("IST wall clock <-> UTC", () => {
  it("00:00 IST on 5 Mar is 18:30Z on 4 Mar", () => {
    expect(platformWallClockToUtc(date("2026-03-05"), "00:00").toISOString()).toBe(
      "2026-03-04T18:30:00.000Z",
    );
  });

  it("23:59 IST on 5 Mar is 18:29Z on 5 Mar", () => {
    expect(platformWallClockToUtc(date("2026-03-05"), "23:59").toISOString()).toBe(
      "2026-03-05T18:29:00.000Z",
    );
  });

  it("throws on a malformed time", () => {
    expect(() => platformWallClockToUtc(date("2026-03-05"), "25:00")).toThrow();
    expect(() => platformWallClockToUtc(date("2026-03-05"), "9:00")).toThrow();
  });

  it("isValidTimeOfDay", () => {
    expect(isValidTimeOfDay("00:00")).toBe(true);
    expect(isValidTimeOfDay("23:59")).toBe(true);
    expect(isValidTimeOfDay("24:00")).toBe(false);
    expect(isValidTimeOfDay("10:60")).toBe(false);
    expect(isValidTimeOfDay(null)).toBe(false);
  });
});

describe("todayInPlatformTz", () => {
  it("the IST date flips at 18:30Z", () => {
    expect(toDateKey(todayInPlatformTz(new Date("2026-03-04T18:29:59Z")))).toBe("2026-03-04");
    expect(toDateKey(todayInPlatformTz(new Date("2026-03-04T18:30:00Z")))).toBe("2026-03-05");
  });
});

describe("calendar arithmetic", () => {
  it("addDays crosses month and year ends", () => {
    expect(toDateKey(addDays(date("2026-03-30"), 3))).toBe("2026-04-02");
    expect(toDateKey(addDays(date("2026-12-31"), 1))).toBe("2027-01-01");
    expect(toDateKey(addDays(date("2026-03-01"), -1))).toBe("2026-02-28");
  });

  it("addOneMonthClamped clamps to the shorter month", () => {
    expect(toDateKey(addOneMonthClamped(date("2026-01-31")))).toBe("2026-02-28");
    expect(toDateKey(addOneMonthClamped(date("2028-01-31")))).toBe("2028-02-29");
    expect(toDateKey(addOneMonthClamped(date("2026-03-31")))).toBe("2026-04-30");
    expect(toDateKey(addOneMonthClamped(date("2026-12-15")))).toBe("2027-01-15");
  });

  it("daysInMonth, weekdayOf, daysBetween, compareDates", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(weekdayOf(date("2026-03-09"))).toBe(1); // Monday
    expect(weekdayOf(date("2026-03-08"))).toBe(0); // Sunday
    expect(daysBetween(date("2026-03-05"), date("2026-04-04"))).toBe(30);
    expect(daysBetween(date("2026-04-04"), date("2026-03-05"))).toBe(-30);
    expect(compareDates(date("2026-03-05"), date("2026-03-06"))).toBeLessThan(0);
    expect(compareDates(date("2026-03-05"), date("2026-03-05"))).toBe(0);
  });

  it("calendarDateToDate / dateToCalendarDate round trip at UTC midnight", () => {
    const d = date("2026-03-05");
    expect(calendarDateToDate(d).toISOString()).toBe("2026-03-05T00:00:00.000Z");
    expect(dateToCalendarDate(calendarDateToDate(d))).toEqual(d);
  });
});