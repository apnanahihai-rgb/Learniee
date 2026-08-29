import { describe, expect, it } from "vitest";
import { parseAge } from "./utils";

describe("parseAge", () => {
  it("parses a normal numeric string", () => {
    expect(parseAge("12")).toBe(12);
  });

  it("returns null for an empty string", () => {
    expect(parseAge("")).toBeNull();
  });

  it("returns null for a whitespace-only string", () => {
    expect(parseAge("   ")).toBeNull();
  });

  it("returns null for non-numeric input instead of NaN", () => {
    expect(parseAge("abc")).toBeNull();
  });

  it("returns null for undefined/non-string input", () => {
    expect(parseAge(undefined)).toBeNull();
    expect(parseAge(null)).toBeNull();
    expect(parseAge(7)).toBeNull();
  });

  it("preserves a real age of 0 instead of treating it as falsy", () => {
    // Regression test: the previous `parseInt(x, 10) || null`
    // pattern turned age 0 into null because 0 is falsy in JS.
    expect(parseAge("0")).toBe(0);
  });

  it("truncates a decimal string the same way parseInt does", () => {
    expect(parseAge("8.9")).toBe(8);
  });
});
