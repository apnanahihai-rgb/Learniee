import { describe, it, expect } from "vitest";
import { cycleTotals, decideCycleClose, type CloseCheckSession } from "./cycleClose";
import { parseDateKey } from "@/lib/platformTime";

function date(k: string) {
  const d = parseDateKey(k);
  if (!d) throw new Error("bad date " + k);
  return d;
}

const CYCLE_START = date("2026-03-05"); // day 45 = 18 Apr 2026

function s(
  status: CloseCheckSession["status"],
  extra: Partial<CloseCheckSession> = {},
): CloseCheckSession {
  return {
    status,
    cancelledByRole: null,
    followUpAppliedAt: null,
    endsAt: new Date("2026-03-10T05:30:00Z"),
    ...extra,
  };
}

describe("cycleTotals", () => {
  it("counts COMPLETED, STUDENT_NO_SHOW and CANCELLED_LATE; the rest is forfeited", () => {
    const t = cycleTotals(
      [s("COMPLETED"), s("STUDENT_NO_SHOW"), s("CANCELLED_LATE"), s("TEACHER_NO_SHOW")],
      4,
    );
    expect(t).toEqual({ counted: 3, forfeited: 1, excused: 0 });
  });

  it("counted never goes above the paid count (make-ups can add rows)", () => {
    const t = cycleTotals([s("COMPLETED"), s("COMPLETED"), s("COMPLETED")], 2);
    expect(t.counted).toBe(2);
    expect(t.forfeited).toBe(0);
  });

  it("an EXCUSED class with no make-up comes off the payable count", () => {
    const t = cycleTotals([s("COMPLETED"), s("COMPLETED"), s("EXCUSED")], 4);
    expect(t).toEqual({ counted: 2, forfeited: 1, excused: 1 });
  });

  it("an EXCUSED class with a make-up is not dropped", () => {
    const t = cycleTotals([s("COMPLETED"), s("EXCUSED", { hasMakeup: true })], 2);
    expect(t.excused).toBe(0);
    expect(t.forfeited).toBe(1);
  });

  it("never goes negative", () => {
    const t = cycleTotals([s("EXCUSED"), s("EXCUSED")], 1);
    expect(t.counted).toBe(0);
    expect(t.forfeited).toBe(0);
  });
});

describe("decideCycleClose: all sessions settled", () => {
  it("closes with ALL_SESSIONS_FINAL and the totals", () => {
    const r = decideCycleClose({
      sessions: [s("COMPLETED"), s("COMPLETED"), s("CANCELLED"), s("CANCELLED")],
      sessionCount: 4,
      cycleStart: CYCLE_START,
      now: new Date("2026-03-20T00:00:00Z"),
    });
    expect(r).toEqual({
      close: true,
      reason: "ALL_SESSIONS_FINAL",
      countedSessions: 2,
      forfeitedSessions: 2,
      excusedSessions: 0,
    });
  });

  it("does not close with no sessions", () => {
    expect(
      decideCycleClose({ sessions: [], sessionCount: 4, cycleStart: CYCLE_START, now: new Date() }),
    ).toEqual({ close: false });
  });

  it("does not close while a session is SCHEDULED (before day 45)", () => {
    const r = decideCycleClose({
      sessions: [s("COMPLETED"), s("SCHEDULED")],
      sessionCount: 2,
      cycleStart: CYCLE_START,
      now: new Date("2026-03-20T00:00:00Z"),
    });
    expect(r.close).toBe(false);
  });

  it("does not close while a no-show is waiting for its follow-up", () => {
    const waiting = decideCycleClose({
      sessions: [s("COMPLETED"), s("TEACHER_NO_SHOW")],
      sessionCount: 2,
      cycleStart: CYCLE_START,
      now: new Date("2026-03-20T00:00:00Z"),
    });
    expect(waiting.close).toBe(false);

    const done = decideCycleClose({
      sessions: [s("COMPLETED"), s("TEACHER_NO_SHOW", { followUpAppliedAt: new Date() })],
      sessionCount: 2,
      cycleStart: CYCLE_START,
      now: new Date("2026-03-20T00:00:00Z"),
    });
    expect(done.close).toBe(true);
  });

  it("does not close while a session is NEEDS_REVIEW (before day 45)", () => {
    const r = decideCycleClose({
      sessions: [s("COMPLETED"), s("NEEDS_REVIEW")],
      sessionCount: 2,
      cycleStart: CYCLE_START,
      now: new Date("2026-03-20T00:00:00Z"),
    });
    expect(r.close).toBe(false);
  });
});

describe("decideCycleClose: day 45", () => {
  const open = [s("COMPLETED"), s("SCHEDULED")];

  it("still open on day 45 itself (18 Apr 23:59:59 IST)", () => {
    const r = decideCycleClose({
      sessions: open,
      sessionCount: 2,
      cycleStart: CYCLE_START,
      now: new Date("2026-04-18T18:29:59Z"),
    });
    expect(r.close).toBe(false);
  });

  it("closes from 19 Apr 00:00 IST with WINDOW_ENDED", () => {
    const r = decideCycleClose({
      sessions: open,
      sessionCount: 2,
      cycleStart: CYCLE_START,
      now: new Date("2026-04-18T18:30:00Z"),
    });
    expect(r).toMatchObject({
      close: true,
      reason: "WINDOW_ENDED",
      countedSessions: 1,
      forfeitedSessions: 1,
    });
  });

  it("a NEEDS_REVIEW session does not hold the cycle open after day 45", () => {
    const r = decideCycleClose({
      sessions: [s("COMPLETED"), s("NEEDS_REVIEW")],
      sessionCount: 2,
      cycleStart: CYCLE_START,
      now: new Date("2026-04-20T00:00:00Z"),
    });
    expect(r).toMatchObject({ close: true, reason: "WINDOW_ENDED" });
  });
});

describe("decideCycleClose: sweep delay after day 45", () => {
  const now = new Date("2026-04-20T10:00:00Z");

  function withEnd(endsAt: Date | null) {
    return decideCycleClose({
      sessions: [s("COMPLETED"), s("SCHEDULED", { endsAt })],
      sessionCount: 2,
      cycleStart: CYCLE_START,
      now,
    });
  }

  it("a session that ended 10 minutes ago is still resolving: stay open", () => {
    expect(withEnd(new Date(now.getTime() - 10 * 60_000)).close).toBe(false);
  });

  it("a session that ended exactly 15 minutes ago no longer holds it open", () => {
    expect(withEnd(new Date(now.getTime() - 15 * 60_000)).close).toBe(true);
  });

  it("a SCHEDULED session with no end time holds it open", () => {
    expect(withEnd(null).close).toBe(false);
  });
});

describe("decideCycleClose: extended deadline (excused classes)", () => {
  const sessions = [s("COMPLETED"), s("SCHEDULED")];
  const extended = date("2026-05-18");

  it("stays open past day 45 while the extension runs", () => {
    const r = decideCycleClose({
      sessions,
      sessionCount: 2,
      cycleStart: CYCLE_START,
      extendedDeadline: extended,
      now: new Date("2026-04-20T00:00:00Z"),
    });
    expect(r.close).toBe(false);
  });

  it("closes the day after the extended deadline", () => {
    const r = decideCycleClose({
      sessions,
      sessionCount: 2,
      cycleStart: CYCLE_START,
      extendedDeadline: extended,
      now: new Date("2026-05-18T18:30:00Z"),
    });
    expect(r).toMatchObject({ close: true, reason: "WINDOW_ENDED" });
  });

  it("an extended deadline earlier than day 45 changes nothing", () => {
    const r = decideCycleClose({
      sessions,
      sessionCount: 2,
      cycleStart: CYCLE_START,
      extendedDeadline: date("2026-03-20"),
      now: new Date("2026-04-18T18:29:59Z"),
    });
    expect(r.close).toBe(false);
  });
});