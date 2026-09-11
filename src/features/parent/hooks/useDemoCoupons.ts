"use client";

import { useCallback, useEffect, useState } from "react";

import { openRazorpayCheckout } from "@/lib/loadRazorpayCheckout";
import {
  DEMO_COUPON_PURCHASE_MIN_QTY,
  DEMO_COUPON_PURCHASE_MAX_QTY,
} from "@/features/shared/utils/demoCouponPurchase";

export interface DemoCouponBalance {
  totalIssued: number;
  usedCount: number;
  remainingFree: number;
  paidDemoPrice: number;
}

export { DEMO_COUPON_PURCHASE_MIN_QTY, DEMO_COUPON_PURCHASE_MAX_QTY };

/**
 * Loads the logged-in parent's demo coupon balance
 * (GET /api/parent/demo-coupons). Account-level, not per child —
 * see 06-OPEN-DECISIONS.md #26. Call `reload()` after a successful
 * booking so the balance reflects the just-used coupon.
 *
 * Also owns the "buy extra coupons" flow (`purchaseCoupons`, added
 * Sep 11, 2026, replacing the old 501-returning placeholder) — same
 * order → Checkout → verify shape as `useWallet()`'s `addMoney()`.
 */
export function useDemoCoupons() {
  const [balance, setBalance] = useState<DemoCouponBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchasing, setPurchasing] = useState(false);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/parent/demo-coupons", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load demo coupon balance.");
      }

      setBalance(data);
    } catch (err) {
      console.error("Load demo coupons error:", err);

      setError(
        err instanceof Error ? err.message : "Failed to load demo coupon balance.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /**
   * Full "buy more coupons" flow: create a Razorpay order for
   * `quantity` coupons, open Checkout, verify the result
   * server-side, then reload the balance. Returns a message to show
   * the parent — success or failure — rather than throwing, so
   * callers don't each need their own try/catch.
   */
  const purchaseCoupons = useCallback(
    async (quantity: number): Promise<{ ok: boolean; message: string }> => {
      if (
        !Number.isInteger(quantity) ||
        quantity < DEMO_COUPON_PURCHASE_MIN_QTY ||
        quantity > DEMO_COUPON_PURCHASE_MAX_QTY
      ) {
        return {
          ok: false,
          message: `Choose between ${DEMO_COUPON_PURCHASE_MIN_QTY} and ${DEMO_COUPON_PURCHASE_MAX_QTY} coupons.`,
        };
      }

      setPurchasing(true);

      try {
        const orderRes = await fetch("/api/parent/demo-coupons/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity }),
        });
        const orderData = await orderRes.json();

        if (!orderRes.ok) {
          throw new Error(orderData.error || "Failed to start payment.");
        }

        const result = await openRazorpayCheckout({
          orderId: orderData.orderId,
          amount: orderData.amount,
          currency: orderData.currency,
          keyId: orderData.keyId,
          name: "Learnie",
          description: `${quantity} demo coupon${quantity === 1 ? "" : "s"}`,
        });

        if (!result) {
          return {
            ok: false,
            message: "Payment cancelled — no charge was made.",
          };
        }

        const verifyRes = await fetch("/api/parent/demo-coupons/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quantity,
            razorpayOrderId: result.razorpay_order_id,
            razorpayPaymentId: result.razorpay_payment_id,
            razorpaySignature: result.razorpay_signature,
          }),
        });
        const verifyData = await verifyRes.json();

        if (!verifyRes.ok) {
          throw new Error(
            verifyData.error ||
              "Payment succeeded but your coupons couldn't be added — contact support.",
          );
        }

        await reload();

        return {
          ok: true,
          message: `${quantity} demo coupon${quantity === 1 ? "" : "s"} added!`,
        };
      } catch (err) {
        console.error("Buy demo coupons error:", err);

        return {
          ok: false,
          message: err instanceof Error ? err.message : "Failed to buy coupons.",
        };
      } finally {
        setPurchasing(false);
      }
    },
    [reload],
  );

  return { balance, loading, error, reload, purchaseCoupons, purchasing };
}
