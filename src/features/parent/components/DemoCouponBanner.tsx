"use client";

import { Gift, Sparkles } from "lucide-react";

import { useDemoCoupons } from "@/features/parent/hooks/useDemoCoupons";

/**
 * Shows the account-level demo coupon balance on the Parent
 * dashboard. Every ParentProfile gets 2 free demo sessions total,
 * shared across every child on the account — not 2 per child (see
 * 06-OPEN-DECISIONS.md #26). After that, demos are a flat ₹100
 * each. Actual booking happens from a course's detail page
 * (BookingPanel) — this is a balance summary, not a booking form.
 */
export default function DemoCouponBanner() {
  const { balance, loading, error } = useDemoCoupons();

  if (loading || error || !balance) {
    return null;
  }

  const { remainingFree, paidDemoPrice } = balance;

  return (
    <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-8">
      <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
        <Gift size={18} />
      </span>

      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-800">
          {remainingFree > 0
            ? `${remainingFree} free demo session${remainingFree === 1 ? "" : "s"} available`
            : "No free demos left"}
        </p>
        <p className="text-xs text-gray-500">
          {remainingFree > 0
            ? "Shared across all your children — open any course below to book one."
            : `Demos are now ₹${paidDemoPrice} each — open any course below to book one.`}
        </p>
      </div>

      <Sparkles size={16} className="text-amber-400 ml-auto flex-shrink-0" />
    </div>
  );
}
