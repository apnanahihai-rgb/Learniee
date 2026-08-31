"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Ticket,
  Plus,
  Minus,
  CalendarClock,
  Sparkles,
  Loader2,
} from "lucide-react";

import { useDemoCoupons } from "@/features/parent/hooks/useDemoCoupons";
import {
  useDemoBookings,
  type DemoBookingListItem,
} from "@/features/parent/hooks/useDemoBookings";

/**
 * Dedicated "Free Demo" page (`/parent/free-demo`, linked from the
 * sidebar). Deliberately scoped to just two things, per request:
 *
 * 1. Buying demo coupons (beyond the 2 free ones every account
 *    gets — 06-OPEN-DECISIONS.md #26). Reuses the same
 *    POST /api/parent/demo-coupons/purchase endpoint as the
 *    navbar's DemoCouponButton, which intentionally returns 501
 *    until Razorpay is wired up (02-ARCHITECTURE.md) — this page
 *    shows that same "coming soon" message rather than pretending
 *    a purchase went through.
 * 2. The parent's scheduled demo lectures — every DemoBooking on
 *    the account, most recent first, split into "Upcoming" and
 *    "Past / other" so a long history doesn't bury what's next.
 *    Every booking here now has a real scheduledAt, since
 *    BookingPanel (course page) requires picking a date and time
 *    before a demo can be booked at all.
 *
 * Nothing else lives here — no course browsing, no child
 * management — those stay on the main dashboard and course pages.
 */
export default function FreeDemoPage() {
  const { balance, loading: balanceLoading } = useDemoCoupons();
  const {
    bookings,
    loading: bookingsLoading,
    error: bookingsError,
  } = useDemoBookings();

  const remainingFree = balance?.remainingFree ?? 0;
  const paidDemoPrice = balance?.paidDemoPrice ?? 100;

  const now = Date.now();
  const upcoming = bookings
    .filter((b) => b.scheduledAt && new Date(b.scheduledAt).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(a.scheduledAt as string).getTime() -
        new Date(b.scheduledAt as string).getTime(),
    );
  const pastOrUnscheduled = bookings
    .filter(
      (b) => !b.scheduledAt || new Date(b.scheduledAt).getTime() < now,
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
          <Ticket size={20} />
        </span>
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-brand">
            Free Demo
          </p>
          <h1 className="font-heading text-xl font-bold text-gray-800">
            Demo coupons &amp; scheduled demos
          </h1>
        </div>
      </div>

      <BuyCouponsCard
        remainingFree={remainingFree}
        paidDemoPrice={paidDemoPrice}
        balanceLoading={balanceLoading}
      />

      <section className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-9 h-9 rounded-xl bg-violet-100 text-brand flex items-center justify-center flex-shrink-0">
            <CalendarClock size={18} />
          </span>
          <h2 className="font-heading text-lg font-bold text-gray-800">
            Scheduled demo lectures
          </h2>
        </div>

        {bookingsError && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-4 text-sm border border-red-100">
            {bookingsError}
          </div>
        )}

        {bookingsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-violet-50 animate-pulse"
              />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-8 text-center">
            <p className="text-gray-500 mb-3">
              No demos booked yet — a demo coupon gets used the moment you
              book a session on a course page.
            </p>
            <Link
              href="/parent"
              className="text-sm font-bold text-brand hover:underline"
            >
              Browse courses
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                  Upcoming
                </p>
                <div className="space-y-2">
                  {upcoming.map((booking) => (
                    <BookingRow key={booking.id} booking={booking} />
                  ))}
                </div>
              </div>
            )}

            {pastOrUnscheduled.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                  Past / other
                </p>
                <div className="space-y-2">
                  {pastOrUnscheduled.map((booking) => (
                    <BookingRow key={booking.id} booking={booking} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function BuyCouponsCard({
  remainingFree,
  paidDemoPrice,
  balanceLoading,
}: {
  remainingFree: number;
  paidDemoPrice: number;
  balanceLoading: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const [purchaseNotice, setPurchaseNotice] = useState("");
  const [purchasing, setPurchasing] = useState(false);

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
    <div className="bg-white border border-violet-100 rounded-3xl shadow-sm p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-1">
        <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
          <Ticket size={18} />
        </span>
        <div>
          <p className="text-sm font-bold text-gray-800">
            {balanceLoading
              ? "Loading balance..."
              : remainingFree > 0
                ? `${remainingFree} free demo${remainingFree === 1 ? "" : "s"} left`
                : "No free demos left"}
          </p>
          <p className="text-xs text-gray-500">
            Shared across all your children — after that, demos are ₹
            {paidDemoPrice} each.
          </p>
        </div>
      </div>

      <div className="h-px bg-violet-100 my-4" />

      <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
        Buy more coupons
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className="w-8 h-8 rounded-full bg-violet-50 text-brand flex items-center justify-center hover:bg-violet-100"
          aria-label="Decrease quantity"
        >
          <Minus size={14} />
        </button>

        <span className="w-8 text-center text-sm font-bold text-gray-800">
          {quantity}
        </span>

        <button
          type="button"
          onClick={() => setQuantity((q) => q + 1)}
          className="w-8 h-8 rounded-full bg-violet-50 text-brand flex items-center justify-center hover:bg-violet-100"
          aria-label="Increase quantity"
        >
          <Plus size={14} />
        </button>

        <span className="text-xs text-gray-500 ml-1">
          coupon{quantity === 1 ? "" : "s"} · ₹{quantity * paidDemoPrice}
        </span>

        <button
          type="button"
          onClick={handleBuy}
          disabled={purchasing}
          className="ml-auto h-9 px-5 rounded-full bg-brand text-white text-sm font-bold hover:bg-brand-dark transition disabled:opacity-60 flex items-center gap-2"
        >
          {purchasing && <Loader2 size={14} className="animate-spin" />}
          Buy for ₹{quantity * paidDemoPrice}
        </button>
      </div>

      {purchaseNotice && (
        <p className="text-xs text-amber-600 mt-3">{purchaseNotice}</p>
      )}
    </div>
  );
}

function statusLabel(booking: DemoBookingListItem) {
  switch (booking.status) {
    case "CONFIRMED":
      return { text: "Confirmed", className: "bg-emerald-50 text-emerald-600" };
    case "PENDING_PAYMENT":
      return { text: "Pending payment", className: "bg-amber-50 text-amber-600" };
    case "COMPLETED":
      return { text: "Completed", className: "bg-violet-100 text-brand" };
    case "CANCELLED":
      return { text: "Cancelled", className: "bg-gray-100 text-gray-500" };
    default:
      return { text: booking.status, className: "bg-gray-100 text-gray-500" };
  }
}

function BookingRow({ booking }: { booking: DemoBookingListItem }) {
  const status = statusLabel(booking);
  const childName = booking.student.visibleName || booking.student.firstName;
  const teacherName =
    booking.teacher.visibleName ||
    `${booking.teacher.firstName} ${booking.teacher.lastName}`.trim();

  return (
    <div className="flex items-start gap-3 bg-white border border-violet-100 rounded-2xl p-4">
      <span className="w-9 h-9 rounded-xl bg-violet-50 text-brand flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles size={16} />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-gray-800 truncate">
            {booking.course.courseTitle || "Demo session"}
          </p>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${status.className}`}
          >
            {status.text}
          </span>
        </div>

        <p className="text-xs text-gray-500 mt-0.5">
          {teacherName} · for {childName}
          {booking.subject ? ` · ${booking.subject}` : ""}
        </p>

        <p className="text-xs text-gray-400 mt-1">
          {booking.scheduledAt
            ? new Date(booking.scheduledAt).toLocaleString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              })
            : "Time not set"}
          {booking.isPaid && booking.amount
            ? ` · ₹${booking.amount} demo`
            : " · Free demo"}
        </p>
      </div>
    </div>
  );
}
