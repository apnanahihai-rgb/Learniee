import { describe, it, expect } from "vitest";
import {
  getStandardPrice,
  getStandardSessionPrice,
  parseGradeNumber,
  parseGradeRange,
  formatGradeRange,
} from "./coursePricing";

describe("getStandardPrice (hourly)", () => {
  it.each([
    ["Grade 1", 400],
    ["Grade 7", 400],
    ["Grade 8", 500],
    ["Grade 10", 500], // 06 #72: Grade 10 sits in the 8-10 tier
    ["Grade 11", 700],
    ["Grade 12", 700],
  ])("%s = %i", (grade, price) => {
    expect(getStandardPrice(grade, false)).toBe(price);
  });

  it("IITian is 700 even with no grade", () => {
    expect(getStandardPrice(null, true)).toBe(700);
    expect(getStandardPrice("Grade 2", true)).toBe(700);
  });

  it("a range is priced at its highest grade", () => {
    expect(getStandardPrice("Grade 7-8", false)).toBe(500);
    expect(getStandardPrice("Grade 6-7", false)).toBe(400);
  });

  it.each(["Grade 0", "Grade 13", "Grade 9-8", "banana", ""])(
    "invalid %j gives null",
    (grade) => {
      expect(getStandardPrice(grade, false)).toBeNull();
    },
  );

  it("null / undefined grade gives null", () => {
    expect(getStandardPrice(null, false)).toBeNull();
    expect(getStandardPrice(undefined, false)).toBeNull();
  });
});

describe("getStandardSessionPrice", () => {
  it.each([
    [30, 200],
    [45, 300],
    [60, 400],
    [90, 600],
    [120, 800],
  ])("Grade 1 at %i min = %i", (minutes, price) => {
    expect(getStandardSessionPrice("Grade 1", false, minutes)).toBe(price);
  });

  it("rounds to whole rupees", () => {
    expect(getStandardSessionPrice("Grade 8", false, 45)).toBe(375);
  });

  it("null when there is no standard rate", () => {
    expect(getStandardSessionPrice("nonsense", false, 60)).toBeNull();
  });
});

describe("grade parsing helpers", () => {
  it("parseGradeNumber / parseGradeRange", () => {
    expect(parseGradeNumber("Grade 8")).toBe(8);
    expect(parseGradeNumber("Grade 6-8")).toBe(8);
    expect(parseGradeRange("Grade 6-8")).toEqual({ from: 6, to: 8 });
    expect(parseGradeRange("grade 6 - grade 8")).toEqual({ from: 6, to: 8 });
  });

  it("formatGradeRange", () => {
    expect(formatGradeRange(8, 8)).toBe("Grade 8");
    expect(formatGradeRange(6, 8)).toBe("Grade 6-8");
    expect(formatGradeRange(0, 8)).toBeNull();
    expect(formatGradeRange(9, 8)).toBeNull();
    expect(formatGradeRange(1, 13)).toBeNull();
  });
});