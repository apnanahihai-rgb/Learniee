import { describe, it, expect } from "vitest";
import { findNextFreeSlot, slotScheduledDate, type SlotContext } from "./makeupSlots";
import { parseDateKey, platformWallClockToUtc, toDateKey } from "@/lib/platformTime";

function date(k: string) {
  const d = parseDateKey(k);
  if (!d) throw new Error("bad date " + k);
  return d;
}

function at(dateKey: string, time: string) {
  return platformWallClockToUtc(date(dateKey), time);
}

const emptyContext: SlotContext = { occupiedDateKeys: new Set(), leaves: [], busy: [] };

// Mondays at 10:00 IST, 60 min. 9 Mar 2026 is a Monday.
function find(overrides: Partial<Parameters<typeof findNextFreeSlot>[0]> = {}) {
  return findNextFreeSlot({
    now: new Date("2026-03-01T00:00:00Z"),
    earliest: date("2026-03-09"),
    deadline: date("2026-04-18"),
    scheduleDays: [1],
    time: "10:00",
    lengthMinutes: 60,
    context: emptyContext,
    ...overrides,
  });
}

describe("findNextFreeSlot", () => {
  it("returns the next matching weekday at the class time", () => {
    const slot = find()!;
    expect(toDateKey(slot.date)).toBe("2026-03-09");
    expect(slot.startsAt.getTime()).toBe(at("2026-03-09", "10:00").getTime());
    expect(slot.endsAt.getTime() - slot.startsAt.getTime()).toBe(60 * 60_000);
  });

  it("skips weekdays that are not in the schedule", () => {
    expect(toDateKey(find({ scheduleDays: [2] })!.date)).toBe("2026-03-10");
  });

  it("skips dates the enrollment already has a session on", () => {
    const slot = find({
      context: { ...emptyContext, occupiedDateKeys: new Set(["2026-03-09"]) },
    })!;
    expect(toDateKey(slot.date)).toBe("2026-03-16");
  });

  it("skips teacher leave (inclusive range)", () => {
    const slot = find({
      context: {
        ...emptyContext,
        leaves: [{ start: date("2026-03-09"), end: date("2026-03-16") }],
      },
    })!;
    expect(toDateKey(slot.date)).toBe("2026-03-23");
  });

  it("needs 4 hours notice: exactly 4 h is allowed", () => {
    // class 10:00 IST = 04:30Z; now = 00:30Z is exactly 4 h before
    const slot = find({ now: new Date("2026-03-09T00:30:00Z") })!;
    expect(toDateKey(slot.date)).toBe("2026-03-09");
  });

  it("needs 4 hours notice: 1 second less moves to next week", () => {
    const slot = find({ now: new Date("2026-03-09T00:30:01Z") })!;
    expect(toDateKey(slot.date)).toBe("2026-03-16");
  });

  it("skips a clash with another SCHEDULED session", () => {
    const slot = find({
      context: {
        ...emptyContext,
        busy: [{ startsAt: at("2026-03-09", "10:30"), endsAt: at("2026-03-09", "11:30") }],
      },
    })!;
    expect(toDateKey(slot.date)).toBe("2026-03-16");
  });

  it("a back-to-back session is not a clash", () => {
    const slot = find({
      context: {
        ...emptyContext,
        busy: [{ startsAt: at("2026-03-09", "09:00"), endsAt: at("2026-03-09", "10:00") }],
      },
    })!;
    expect(toDateKey(slot.date)).toBe("2026-03-09");
  });

  it("returns null when nothing fits before the deadline", () => {
    expect(
      find({
        deadline: date("2026-03-15"),
        context: { ...emptyContext, occupiedDateKeys: new Set(["2026-03-09"]) },
      }),
    ).toBeNull();
  });

  it("the deadline day itself is allowed", () => {
    expect(toDateKey(find({ deadline: date("2026-03-09") })!.date)).toBe("2026-03-09");
  });

  it("returns null when earliest is after the deadline", () => {
    expect(find({ earliest: date("2026-04-20") })).toBeNull();
  });

  it("returns null for an empty schedule", () => {
    expect(find({ scheduleDays: [] })).toBeNull();
  });
});

describe("slotScheduledDate", () => {
  it("is UTC midnight of the calendar date", () => {
    expect(slotScheduledDate(find()!).toISOString()).toBe("2026-03-09T00:00:00.000Z");
  });
});