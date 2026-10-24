import { describe, expect, it } from "vitest";
import { splitWalletPayment, walletAmountFromNotes } from "./walletSplit";

const split = (total: number, wallet: number, intl = false) =>
  splitWalletPayment({ totalAmount: total, requestedWalletAmount: wallet, isInternational: intl });

describe("splitWalletPayment", () => {
  it("wallet covers everything", () => {
    const r = split(1000, 1000);
    expect(r.walletAmount).toBe(1000);
    expect(r.cardBase).toBe(0);
    expect(r.cardCharge).toBe(0);
  });
  it("wallet above total is clamped", () => {
    const r = split(1000, 5000);
    expect(r.walletAmount).toBe(1000);
    expect(r.cardBase).toBe(0);
  });
  it("negative wallet request is 0", () => {
    const r = split(1000, -50);
    expect(r.walletAmount).toBe(0);
    expect(r.cardBase).toBe(1000);
  });
  it("part payment", () => {
    const r = split(1000, 300);
    expect(r.walletAmount).toBe(300);
    expect(r.cardBase).toBe(700);
    expect(r.gstAmount).toBe(126);
    expect(r.cardCharge).toBe(826);
  });
  it("card remainder under Rs 1 is bumped to Rs 1", () => {
    const r = split(1000, 999.5);
    expect(r.cardBase).toBe(1);
    expect(r.walletAmount).toBe(999);
  });
  it("surcharge applies to the card part only", () => {
    const r = split(1000, 400, true);
    expect(r.cardBase).toBe(600);
    expect(r.surchargeAmount).toBeGreaterThan(0);
    expect(r.cardCharge).toBe(r.cardBase + r.surchargeAmount + r.gstAmount);
    expect(r.walletAmount).toBe(400);
  });
  it("no surcharge when wallet covers all, even international", () => {
    expect(split(1000, 1000, true).surchargeAmount).toBe(0);
  });
});

describe("walletAmountFromNotes", () => {
  it("reads a valid amount", () => {
    expect(walletAmountFromNotes({ walletAmount: "250.5" })).toBe(250.5);
  });
  it.each([undefined, null, "abc", -5, 0, NaN])("rejects %s", (v) => {
    expect(walletAmountFromNotes({ walletAmount: v })).toBe(0);
  });
  it("rejects missing key", () => {
    expect(walletAmountFromNotes({})).toBe(0);
  });
});