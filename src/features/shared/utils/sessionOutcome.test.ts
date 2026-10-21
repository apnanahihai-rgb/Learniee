import { describe, it, expect } from "vitest";
import {
  COUNTED_SESSION_STATUSES,
  decideSessionOutcome,
  getSessionActions,
  hasCancelNotice,
  isJoinWindowOpen,
  isSessionSettled,
  joinOpensAt,
  measureOverlapMs,
  overlapPercent,
  parentCancelStatus,
  planSessionFollowUp,
  sessionOutcomeCounts,
  studentAbsentFrom,
  type SessionStatusValue,
} from "./sessionOutcome";
import { parseDateKey, platformWallClockToUtc } from "@/lib/platformTime";

// Class on 10 Mar 2026, 10:00-11:00 IST (60 minutes).
function at(time: string, dateKey = "2026-03-10"): Date {
  const d = parseDateKey(dateKey);
  if (!d) throw new Error("bad date");
  return platformWallClockToUtc(d, time);
}

function atSec(time: string, seconds: number, dateKey = "2026-03-10"): Date {
  return new Date(at(time, dateKey).getTime() + seconds * 1000);
}

const times = { startsAt: at("10:00"), endsAt: at("11:00") };
const none = { teacherStartedAt: null, teacherEndedAt: null, studentJoinedAt: null };

describe("decideSessionOutcome", () => {
  it("both there the whole class = COMPLETED", () => {
    const r = decideSessionOutcome(times, {
      teacherStartedAt: at("10:00"),
      teacherEndedAt: at("11:00"),
      studentJoinedAt: at("10:00"),
    });
    expect(r.status).toBe("COMPLETED");
    expect(r.overlapSeconds).toBe(3600);
    expect(r.cancelledByRole).toBeNull();
  });

  it("exactly 50% overlap = COMPLETED", () => {
    const r = decideSessionOutcome(times, {
      teacherStartedAt: at("10:00"),
      teacherEndedAt: null, // never tapped End: present until the scheduled end
      studentJoinedAt: at("10:30"),
    });
    expect(r.status).toBe("COMPLETED");
    expect(r.overlapSeconds).toBe(1800);
  });

  it("1 second under 50% = NEEDS_REVIEW", () => {
    const r = decideSessionOutcome(times, {
      teacherStartedAt: at("10:00"),
      teacherEndedAt: null,
      studentJoinedAt: atSec("10:30", 1),
    });
    expect(r.status).toBe("NEEDS_REVIEW");
    expect(r.overlapSeconds).toBe(1799);
  });

  it("teacher ends early (20 of 60 min) = NEEDS_REVIEW", () => {
    const r = decideSessionOutcome(times, {
      teacherStartedAt: at("10:00"),
      teacherEndedAt: at("10:20"),
      studentJoinedAt: at("10:00"),
    });
    expect(r.status).toBe("NEEDS_REVIEW");
  });

  it("time before the start never counts", () => {
    const r = decideSessionOutcome(times, {
      teacherStartedAt: at("09:50"),
      teacherEndedAt: at("11:00"),
      studentJoinedAt: at("09:55"),
    });
    expect(r.status).toBe("COMPLETED");
    expect(r.overlapSeconds).toBe(3600); // capped at the session length
  });

  it("teacher only = STUDENT_NO_SHOW", () => {
    const r = decideSessionOutcome(times, { ...none, teacherStartedAt: at("10:00") });
    expect(r).toEqual({ status: "STUDENT_NO_SHOW", overlapSeconds: null, cancelledByRole: null });
  });

  it("student only = TEACHER_NO_SHOW", () => {
    const r = decideSessionOutcome(times, { ...none, studentJoinedAt: at("10:00") });
    expect(r).toEqual({ status: "TEACHER_NO_SHOW", overlapSeconds: null, cancelledByRole: null });
  });

  it("nobody = CANCELLED by SYSTEM", () => {
    const r = decideSessionOutcome(times, none);
    expect(r).toEqual({ status: "CANCELLED", overlapSeconds: null, cancelledByRole: "SYSTEM" });
  });

  it("zero-length session never counts as held", () => {
    const zero = { startsAt: at("10:00"), endsAt: at("10:00") };
    const r = decideSessionOutcome(zero, {
      teacherStartedAt: at("10:00"),
      teacherEndedAt: null,
      studentJoinedAt: at("10:00"),
    });
    expect(r.status).toBe("NEEDS_REVIEW");
  });
});

describe("measureOverlapMs / overlapPercent", () => {
  it("is 0 when one side never joined", () => {
    expect(measureOverlapMs(times, { ...none, teacherStartedAt: at("10:00") })).toBe(0);
  });

  it("overlapPercent rounds, caps at 100 and handles null", () => {
    expect(overlapPercent(times, 1800)).toBe(50);
    expect(overlapPercent(times, 99999)).toBe(100);
    expect(overlapPercent(times, null)).toBeNull();
  });
});

describe("join window", () => {
  it("opens 10 minutes before the start", () => {
    expect(joinOpensAt(times.startsAt).getTime()).toBe(at("09:50").getTime());
  });

  it("is open from 09:50 up to (not including) the end", () => {
    expect(isJoinWindowOpen(times, atSec("09:50", -1))).toBe(false);
    expect(isJoinWindowOpen(times, at("09:50"))).toBe(true);
    expect(isJoinWindowOpen(times, atSec("11:00", -1))).toBe(true);
    expect(isJoinWindowOpen(times, at("11:00"))).toBe(false);
  });

  it("student-absent end is possible from 10 minutes after the start", () => {
    expect(studentAbsentFrom(times.startsAt).getTime()).toBe(at("10:10").getTime());
  });
});

describe("cancel notice (4 hours)", () => {
  it("exactly 4 h ahead is free", () => {
    expect(hasCancelNotice(times.startsAt, at("06:00"))).toBe(true);
    expect(parentCancelStatus(times.startsAt, at("06:00"))).toBe("CANCELLED");
  });

  it("3 h 59 m 59 s ahead is late", () => {
    expect(hasCancelNotice(times.startsAt, atSec("06:00", 1))).toBe(false);
    expect(parentCancelStatus(times.startsAt, atSec("06:00", 1))).toBe("CANCELLED_LATE");
  });

  it("4 h 01 m ahead is free", () => {
    expect(parentCancelStatus(times.startsAt, at("05:59"))).toBe("CANCELLED");
  });
});

describe("getSessionActions", () => {
  const base = { ...times, ...none, status: "SCHEDULED" as SessionStatusValue };

  it("teacher can Start inside the window, not before", () => {
    expect(getSessionActions("TEACHER", base, at("09:49")).canStart).toBe(false);
    expect(getSessionActions("TEACHER", base, at("09:50")).canStart).toBe(true);
  });

  it("parent cannot Start, teacher cannot Join", () => {
    expect(getSessionActions("PARENT", base, at("10:00")).canStart).toBe(false);
    expect(getSessionActions("TEACHER", base, at("10:00")).canJoin).toBe(false);
    expect(getSessionActions("PARENT", base, at("10:00")).canJoin).toBe(true);
  });

  it("parent cannot Join twice", () => {
    const joined = { ...base, studentJoinedAt: at("10:00") };
    expect(getSessionActions("PARENT", joined, at("10:05")).canJoin).toBe(false);
  });

  it("teacher cannot End before starting", () => {
    expect(getSessionActions("TEACHER", base, at("10:30")).canEnd).toBe(false);
  });

  it("teacher can End once the student joined", () => {
    const s = { ...base, teacherStartedAt: at("10:00"), studentJoinedAt: at("10:01") };
    const a = getSessionActions("TEACHER", s, at("10:02"));
    expect(a.canEnd).toBe(true);
    expect(a.endsAsStudentAbsent).toBe(false);
  });

  it("student-absent End unlocks at 10:10", () => {
    const s = { ...base, teacherStartedAt: at("10:00") };
    expect(getSessionActions("TEACHER", s, atSec("10:10", -1)).canEnd).toBe(false);
    const a = getSessionActions("TEACHER", s, at("10:10"));
    expect(a.canEnd).toBe(true);
    expect(a.endsAsStudentAbsent).toBe(true);
  });

  it("cancel only before the start and before anyone is in", () => {
    expect(getSessionActions("PARENT", base, at("09:00")).canCancel).toBe(true);
    expect(getSessionActions("PARENT", base, at("10:00")).canCancel).toBe(false);
    const started = { ...base, teacherStartedAt: at("09:55") };
    expect(getSessionActions("PARENT", started, at("09:56")).canCancel).toBe(false);
  });

  it("cancelIsLate is parent-only and inside 4 h", () => {
    expect(getSessionActions("PARENT", base, at("07:00")).cancelIsLate).toBe(true);
    expect(getSessionActions("PARENT", base, at("05:00")).cancelIsLate).toBe(false);
    expect(getSessionActions("TEACHER", base, at("07:00")).cancelIsLate).toBe(false);
  });

  it("nothing is possible once the session is no longer SCHEDULED", () => {
    const done = { ...base, status: "COMPLETED" as SessionStatusValue };
    const a = getSessionActions("TEACHER", done, at("10:30"));
    expect(a.canStart || a.canJoin || a.canEnd || a.canCancel).toBe(false);
  });
});

describe("what counts toward a cycle", () => {
  it.each([
    ["COMPLETED", true],
    ["STUDENT_NO_SHOW", true],
    ["CANCELLED_LATE", true],
    ["TEACHER_NO_SHOW", false],
    ["CANCELLED", false],
    ["MISSED", false],
    ["EXCUSED", false],
    ["SCHEDULED", null],
    ["NEEDS_REVIEW", null],
  ] as const)("%s -> %s", (status, expected) => {
    expect(sessionOutcomeCounts(status)).toBe(expected);
  });

  it("COUNTED_SESSION_STATUSES matches sessionOutcomeCounts exactly", () => {
    const all: SessionStatusValue[] = [
      "SCHEDULED", "COMPLETED", "CANCELLED", "MISSED", "STUDENT_NO_SHOW",
      "TEACHER_NO_SHOW", "CANCELLED_LATE", "NEEDS_REVIEW", "EXCUSED",
    ];
    const counted = all.filter((s) => sessionOutcomeCounts(s) === true).sort();
    expect([...COUNTED_SESSION_STATUSES].sort()).toEqual(counted);
  });
});

describe("planSessionFollowUp", () => {
  it("teacher no-show: make-up + strike + admin alert", () => {
    expect(planSessionFollowUp("TEACHER_NO_SHOW", null)).toEqual({
      makeup: true, strike: "TEACHER_NO_SHOW", alertAdmin: true, noticeParent: false,
    });
  });

  it("nobody joined (system cancel): make-up, no strike", () => {
    const p = planSessionFollowUp("CANCELLED", "SYSTEM");
    expect(p?.makeup).toBe(true);
    expect(p?.strike).toBeNull();
  });

  it("teacher cancel: make-up + strike", () => {
    const p = planSessionFollowUp("CANCELLED", "TEACHER");
    expect(p?.makeup).toBe(true);
    expect(p?.strike).toBe("TEACHER_CANCELLED");
  });

  it("parent cancel: nothing", () => {
    expect(planSessionFollowUp("CANCELLED", "PARENT")).toBeNull();
    expect(planSessionFollowUp("CANCELLED", null)).toBeNull();
  });

  it("student no-show: parent notice only", () => {
    expect(planSessionFollowUp("STUDENT_NO_SHOW", null)).toEqual({
      makeup: false, strike: null, alertAdmin: false, noticeParent: true,
    });
  });

  it("excused: make-up, never a strike", () => {
    const p = planSessionFollowUp("EXCUSED", null);
    expect(p?.makeup).toBe(true);
    expect(p?.strike).toBeNull();
  });

  it.each(["COMPLETED", "CANCELLED_LATE", "SCHEDULED", "NEEDS_REVIEW"] as const)(
    "%s needs no follow-up",
    (status) => {
      expect(planSessionFollowUp(status, null)).toBeNull();
    },
  );
});

describe("isSessionSettled", () => {
  it("SCHEDULED and NEEDS_REVIEW are never settled", () => {
    expect(isSessionSettled({ status: "SCHEDULED", cancelledByRole: null, followUpAppliedAt: null })).toBe(false);
    expect(isSessionSettled({ status: "NEEDS_REVIEW", cancelledByRole: null, followUpAppliedAt: null })).toBe(false);
  });

  it("a final outcome with no follow-up is settled", () => {
    expect(isSessionSettled({ status: "COMPLETED", cancelledByRole: null, followUpAppliedAt: null })).toBe(true);
  });

  it("a no-show is settled only after its follow-up ran", () => {
    expect(isSessionSettled({ status: "TEACHER_NO_SHOW", cancelledByRole: null, followUpAppliedAt: null })).toBe(false);
    expect(isSessionSettled({ status: "TEACHER_NO_SHOW", cancelledByRole: null, followUpAppliedAt: new Date() })).toBe(true);
  });
});