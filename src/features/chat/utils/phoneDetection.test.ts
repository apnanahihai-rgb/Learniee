import { describe, expect, it } from "vitest";
import { maskPhoneNumbers, PHONE_MASK_PLACEHOLDER } from "./phoneDetection";

describe("maskPhoneNumbers: masked", () => {
  it.each([
    "9876543210",
    "+91 98765 43210",
    "98765-43210",
    "9 8 7 6 5 4 3 2 1 0",
  ])("masks %s", (num) => {
    const r = maskPhoneNumbers(`call me on ${num} ok`);
    expect(r.found).toBe(true);
    expect(r.masked).toBe(`call me on ${PHONE_MASK_PLACEHOLDER} ok`);
  });
});

describe("maskPhoneNumbers: not masked", () => {
  it.each(["1,00,000", "21/10/2026", "pincode 410206", "hello there"])(
    "keeps %s",
    (text) => {
      const r = maskPhoneNumbers(text);
      expect(r.found).toBe(false);
      expect(r.masked).toBe(text);
    },
  );
});

// KNOWN FALSE POSITIVES (testing plan, bug log Oct 21). Pinned as-is.
// If you fix the detector, flip these to expect found === false.
describe("maskPhoneNumbers: known false positives (pinned)", () => {
  it.each(["2026-10-21", "21-10-2026", "21.10.2026", "12345.50"])(
    "currently masks %s",
    (text) => {
      expect(maskPhoneNumbers(text).found).toBe(true);
    },
  );
});

describe("maskPhoneNumbers: known gap", () => {
  it.fails("does not yet detect spelled-out digits", () => {
    expect(
      maskPhoneNumbers("nine eight seven six five four three two one zero").found,
    ).toBe(true);
  });
});