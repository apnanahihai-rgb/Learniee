import { describe, it, expect } from "vitest";
import { isEmergencyLeave } from "./leaveRules";

// Leave starting 10 Mar 2026 (saved as UTC midnight of that date).
// It begins at 00:00 IST = 09 Mar 18:30Z.
const startDate = new Date("2026-03-10T00:00:00Z");

describe("isEmergencyLeave", () => {
  it("submitted exactly 24 h before the leave begins is NOT an emergency", () => {
    expect(isEmergencyLeave(startDate, new Date("2026-03-08T18:30:00Z"))).toBe(false);
  });

  it("submitted 23 h 59 m 59 s before is an emergency", () => {
    expect(isEmergencyLeave(startDate, new Date("2026-03-08T18:30:01Z"))).toBe(true);
  });

  it("submitted days ahead is not an emergency", () => {
    expect(isEmergencyLeave(startDate, new Date("2026-03-01T00:00:00Z"))).toBe(false);
  });

  it("submitted after the leave already began is an emergency", () => {
    expect(isEmergencyLeave(startDate, new Date("2026-03-10T06:00:00Z"))).toBe(true);
  });
});