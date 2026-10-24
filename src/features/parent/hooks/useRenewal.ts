"use client";

import { useCallback, useEffect, useState } from "react";

import { askPaymentMethod } from "@/lib/askPaymentMethod";
import { openRazorpayCheckout } from "@/lib/loadRazorpayCheckout";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";
import { useWalletBalance } from "@/features/parent/hooks/useWalletBalance";

export interface RenewalPreview {
  nextCycleNumber: number;
  scheduleDays: number[];
  scheduleTime: string;
  cycleStartKey: string;
  /** Hand-picked dates for the next cycle; empty = repeating weekdays. */
  customDates: string[];
  sessionCount: number;
  ratePerSession: number;
  totalAmount: number;
  isInternationalPayment: boolean;
  internationalSurchargeAmount: number;
  gstAmount?: number;
  amountPayable: number;
}

export interface RenewalStatus {
  eligible: boolean;
  alreadyRenewed: boolean;
  opensOn: string;
  currentCycleNumber: number;
  currentCycleEndDate: string;
  currentScheduleDays: number[];
  currentScheduleTime: string | null;
  /** True on the "Complete month plan": the next cycle's dates are picked one by one. */
  isCustomPlan: boolean;
  nextCycleStartKey: string;
  nextCycleEndKey: string;
  preview: RenewalPreview | null;
}

/** What the parent can change for the next cycle. `customDates` only on the "Complete month plan". */
export interface RenewalOverrides {
  scheduleDays?: number[];
  scheduleTime?: string;
  customDates?: string[];
}

export function useRenewal(enrollmentId: string) {
  const [status, setStatus] = useState<RenewalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const { balance: walletBalance, reload: reloadWallet } = useWalletBalance();

  const load = useCallback(async () => {
    try {
      if (!isBackgroundRefresh()) setLoading(true);

      const res = await fetch(`/api/parent/enrollments/${enrollmentId}/renew`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load renewal status.");

      setStatus(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load renewal status.");
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: ["/api/parent/enrollments"] });

  async function renew(
    overrides: RenewalOverrides,
    options: { useWallet?: boolean } = {},
  ) {
    try {
      setPaying(true);
      setError("");

      // UPI adds a transaction charge, so ask BEFORE the order is created.
      const total = status?.preview?.totalAmount ?? 0;
      const cardBase = options.useWallet ? Math.max(total - (walletBalance ?? 0), 1) : total;
      const paymentMethod = await askPaymentMethod({ baseAmount: cardBase });

      if (!paymentMethod) {
        return { ok: false, message: "Payment cancelled — no charge was made." };
      }

      const orderRes = await fetch(`/api/parent/enrollments/${enrollmentId}/renew/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...overrides, useWallet: options.useWallet === true, paymentMethod }),
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to start the renewal payment.");
      }

      const result = await openRazorpayCheckout({
        orderId: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId: orderData.keyId,
        paymentMethod,
        name: "Learnie",
        description: `Cycle ${orderData.pricing.nextCycleNumber} renewal`,
      });

      if (!result) {
        return { ok: false, message: "Payment cancelled — no charge was made." };
      }

      const verifyRes = await fetch(`/api/parent/enrollments/${enrollmentId}/renew/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: result.razorpay_order_id,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpaySignature: result.razorpay_signature,
        }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(
          verifyData.error || "Payment succeeded but the renewal couldn't be confirmed.",
        );
      }

      await Promise.all([load(), reloadWallet()]);

      return { ok: true, message: "Renewed! Next cycle's classes are on your calendar." };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to renew.";
      setError(message);
      return { ok: false, message };
    } finally {
      setPaying(false);
    }
  }

  /** Renews from the Wallet balance (06 #44). `requestId` makes a retry safe on the server. */
  async function renewWithWallet(overrides: RenewalOverrides) {
    try {
      setPaying(true);
      setError("");

      const res = await fetch(`/api/parent/enrollments/${enrollmentId}/renew/wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...overrides, requestId: crypto.randomUUID() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to renew from your wallet.");
      }

      await Promise.all([load(), reloadWallet()]);

      return { ok: true, message: "Renewed from your wallet! Next cycle's classes are on your calendar." };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to renew from your wallet.";
      setError(message);
      return { ok: false, message };
    } finally {
      setPaying(false);
    }
  }

  return { status, loading, paying, error, renew, renewWithWallet, walletBalance, reload: load };
}
