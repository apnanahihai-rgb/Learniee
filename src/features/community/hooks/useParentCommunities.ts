"use client";

import { useCallback, useEffect, useState } from "react";

import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { askPaymentMethod } from "@/lib/askPaymentMethod";
import { openRazorpayCheckout } from "@/lib/loadRazorpayCheckout";
import { isBackgroundRefresh } from "@/lib/refreshBus";

import type { ParentCommunityDetail, ParentCommunityRow } from "../types/community";

export type MembershipResult = { ok: true } | { ok: false; error: string };

const BASE = "/api/parent/communities";

async function changeMembership(communityId: string, method: "POST" | "DELETE"): Promise<MembershipResult> {
  try {
    const res = await fetch(`${BASE}/${communityId}/membership`, { method });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: data.error || "Something went wrong. Please try again." };
    }

    return { ok: true };
  } catch (err) {
    console.error("Community membership error:", err);

    return { ok: false, error: "Network error. Please try again." };
  }
}

/**
 * Pay to join a paid community: ask UPI-or-other (UPI adds a charge, so this
 * comes BEFORE the order), create the order, open Razorpay Checkout, then
 * verify. Verify joins the Parent automatically. Returns a message instead of
 * throwing so callers need no try/catch.
 */
async function payForCommunity(community: { id: string; title: string; price: number | null }): Promise<MembershipResult> {
  try {
    const paymentMethod = await askPaymentMethod({ baseAmount: community.price ?? 0 });

    if (!paymentMethod) {
      return { ok: false, error: "Payment cancelled. No charge was made." };
    }

    const orderRes = await fetch(`${BASE}/${community.id}/payment/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethod }),
    });
    const order = await orderRes.json().catch(() => ({}));

    if (!orderRes.ok) {
      return { ok: false, error: order.error || "Failed to start the payment." };
    }

    const result = await openRazorpayCheckout({
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      keyId: order.keyId,
      paymentMethod,
      name: "Learnie",
      description: `Community: ${community.title}`,
    });

    if (!result) {
      return { ok: false, error: "Payment cancelled. No charge was made." };
    }

    const verifyRes = await fetch(`${BASE}/${community.id}/payment/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpayOrderId: result.razorpay_order_id,
        razorpayPaymentId: result.razorpay_payment_id,
        razorpaySignature: result.razorpay_signature,
      }),
    });
    const verified = await verifyRes.json().catch(() => ({}));

    if (!verifyRes.ok) {
      return {
        ok: false,
        error:
          verified.error ||
          "Payment went through but we couldn't add you yet. Please refresh in a minute, or contact support with your payment ID.",
      };
    }

    return { ok: true };
  } catch (err) {
    console.error("Community payment error:", err);

    return { ok: false, error: err instanceof Error ? err.message : "Payment failed. Please try again." };
  }
}

/** Parent's community list + join / leave / pay. Data: /api/parent/communities. Refreshes live. */
export function useParentCommunities() {
  const [communities, setCommunities] = useState<ParentCommunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      if (!isBackgroundRefresh()) setLoading(true);
      setError("");

      const res = await fetch(BASE, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "Failed to load communities.");

      setCommunities(data.communities ?? []);
    } catch (err) {
      console.error("Load communities error:", err);
      setError(err instanceof Error ? err.message : "Failed to load communities.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: [BASE] });

  const join = useCallback(
    async (communityId: string) => {
      const result = await changeMembership(communityId, "POST");

      if (result.ok) await load();

      return result;
    },
    [load],
  );

  const leave = useCallback(
    async (communityId: string) => {
      const result = await changeMembership(communityId, "DELETE");

      if (result.ok) await load();

      return result;
    },
    [load],
  );

  const pay = useCallback(
    async (community: { id: string; title: string; price: number | null }) => {
      const result = await payForCommunity(community);

      // Reload even on failure: the webhook may have joined the Parent already.
      await load();

      return result;
    },
    [load],
  );

  return { communities, loading, error, reload: load, join, leave, pay };
}

/** One community for a Parent (files only once joined). Refreshes live. */
export function useParentCommunity(communityId: string) {
  const [community, setCommunity] = useState<ParentCommunityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      if (!isBackgroundRefresh()) setLoading(true);
      setError("");

      const res = await fetch(`${BASE}/${communityId}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "Failed to load the community.");

      setCommunity(data.community);
    } catch (err) {
      console.error("Load community error:", err);
      setCommunity(null);
      setError(err instanceof Error ? err.message : "Failed to load the community.");
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    void load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: [BASE, "/api/parent/invoices"] });

  const join = useCallback(async () => {
    const result = await changeMembership(communityId, "POST");

    if (result.ok) await load();

    return result;
  }, [communityId, load]);

  const leave = useCallback(async () => {
    const result = await changeMembership(communityId, "DELETE");

    if (result.ok) await load();

    return result;
  }, [communityId, load]);

  const pay = useCallback(async () => {
    if (!community) return { ok: false, error: "Community not loaded yet." } as MembershipResult;

    const result = await payForCommunity(community);

    await load();

    return result;
  }, [community, load]);

  return { community, loading, error, reload: load, join, leave, pay };
}
