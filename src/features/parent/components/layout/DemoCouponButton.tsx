"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ticket, Plus, Minus, CalendarClock, Sparkles } from "lucide-react";

import { useDemoCoupons } from "@/features/parent/hooks/useDemoCoupons";
import { useDemoBookings } from "@/features/parent/hooks/useDemoBookings";

/**
 * Navbar entry point for everything demo-coupon related: remaining
 * free-demo balance, the flat per-demo price once those run out,
 * buying more coupons, and a quick look at upcoming demo bookings.
 * Replaces the old dashboard-page DemoCouponBanner (moved here per
 * request, Aug 30, 2026) — account-level, not per child, see
 * 06-OPEN-DECISIONS.md #26.
 *
 * "Buy more" currently calls POST /api/parent/demo-coupons/purchase,
 * which intentionally returns 501 — Razorpay isn't integrated yet
 * (02-ARCHITECTURE.md), so this shows the server's "coming soon"
 * message rather than silently granting coupons with no real
 * charge. Swap this over to a real checkout once the gateway exists.
 */
export default function DemoCouponButton() {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [purchaseNotice, setPurchaseNotice] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { balance, loading: balanceLoading } = useDemoCoupons();
  const { bookings, loading: bookingsLoading } = useDemoBookings();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const upcomingBookings = bookings
    .filter((b) => b.scheduledAt && new Date(b.scheduledAt) >= new Date())
    .sort(
      (a, b) =>
        new Date(a.scheduledAt as string).getTime() -
        new Date(b.scheduledAt as string).getTime(),
    )
    .slice(0, 5);

  const remainingFree = balance?.remainingFree ?? 0;
  const paidDemoPrice = balance?.paidDemoPrice ?? 100;

  async function handleBuy() {
    setPurchasing(true);
    setPurchaseNotice("");

    try {
      const res = await fetch("/api/parent/demo-coupons/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });

      const data = await res.json();

      setPurchaseNotice(
        data.error || "Something went wrong — try again in a moment.",
      );
    } catch (err) {
      console.error("Buy demo coupons error:", err);
      setPurchaseNotice("Something went wrong — try again in a moment.");
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Demo coupons"
        className="relative flex items-center gap-1.5 h-9 pl-2.5 pr-3 rounded-full bg-violet-50 text-brand hover:bg-violet-100 transition"
      >
        <Ticket size={17} />
        <span className="text-sm font-bold">
          {balanceLoading ? "–" : remainingFree}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl border border-violet-100 shadow-playful p-4 z-50">
          {/* BALANCE */}
          <div className="flex items-center gap-3 mb-4">
            <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Ticket size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800">
                {balanceLoading
                  ? "Loading balance..."
                  : remainingFree > 0
                    ? `${remainingFree} free demo${remainingFree === 1 ? "" : "s"} left`
                    : "No free demos left"}
              </p>
              <p className="text-xs text-gray-500">
                Shared across all your children. After that, demos are ₹
                {paidDemoPrice} each.
              </p>
            </div>
          </div>

          <div className="h-px bg-violet-100 mb-4" />

          {/* BUY MORE */}
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
              Buy more coupons
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-7 h-7 rounded-full bg-violet-50 text-brand flex items-center justify-center hover:bg-violet-100"
                aria-label="Decrease quantity"
              >
                <Minus size={13} />
              </button>

              <span className="w-8 text-center text-sm font-bold text-gray-800">
                {quantity}
              </span>

              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-7 h-7 rounded-full bg-violet-50 text-brand flex items-center justify-center hover:bg-violet-100"
                aria-label="Increase quantity"
              >
                <Plus size={13} />
              </button>

              <span className="text-xs text-gray-500 ml-1">
                coupon{quantity === 1 ? "" : "s"} · ₹{quantity * paidDemoPrice}
              </span>
            </div>

            <button
              type="button"
              onClick={handleBuy}
              disabled={purchasing}
              className="w-full mt-2.5 h-9 rounded-full bg-brand text-white text-sm font-bold hover:bg-brand-dark transition disabled:opacity-60"
            >
              {purchasing
                ? "Please wait..."
                : `Buy for ₹${quantity * paidDemoPrice}`}
            </button>

            {purchaseNotice && (
              <p className="text-xs text-amber-600 mt-2">{purchaseNotice}</p>
            )}
          </div>

          <div className="h-px bg-violet-100 mb-4" />

          {/* UPCOMING DEMOS */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5">
              <CalendarClock size={13} />
              Upcoming demos
            </p>

            {bookingsLoading ? (
              <p className="text-xs text-gray-400">Loading...</p>
            ) : upcomingBookings.length === 0 ? (
              <p className="text-xs text-gray-500">
                No upcoming demos scheduled yet.{" "}
                <Link
                  href="/parent"
                  className="text-brand font-semibold hover:underline"
                  onClick={() => setOpen(false)}
                >
                  Browse courses
                </Link>{" "}
                to book one.
              </p>
            ) : (
              <ul className="space-y-2">
                {upcomingBookings.map((booking) => (
                  <li
                    key={booking.id}
                    className="flex items-center gap-2 bg-violet-50/60 rounded-xl px-3 py-2"
                  >
                    <Sparkles
                      size={13}
                      className="text-amber-400 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {booking.course.courseTitle || "Demo session"}
                        {booking.teacher &&
                          ` · ${booking.teacher.visibleName || booking.teacher.firstName}`}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {booking.scheduledAt
                          ? new Date(booking.scheduledAt).toLocaleString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                hour: "numeric",
                                minute: "2-digit",
                              },
                            )
                          : "Time to be confirmed"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
