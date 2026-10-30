"use client";

import { useState } from "react";

import { askPaymentMethod } from "@/lib/askPaymentMethod";
import { openRazorpayCheckout } from "@/lib/loadRazorpayCheckout";

function formatSelection(date: Date | null, hour: number | null) {
  if (!date || hour == null) {
    return null;
  }

  return `${date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })}, ${istClockLabel(hour)} IST`;
}

function istClockLabel(hour: number) {
  const period = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 === 0 ? 12 : hour % 12}:00 ${period}`;
}

/** The picked calendar date + hour, read as IST wall-clock (the platform timezone), as an ISO instant. */
function toIstIso(date: Date, hour: number) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(hour).padStart(2, "0");
  return new Date(`${y}-${m}-${d}T${h}:00:00+05:30`).toISOString();
}

interface Args {
  selectedStudentId: string;
  teacherId: string;
  courseId: string;
  subject: string | null;
  remainingFree: number;
  paidDemoPrice: number;
  reloadBalance: () => void;
}

/** Calendar selection + the free / paid demo booking flow. */
export function useDemoBooking({
  selectedStudentId,
  teacherId,
  courseId,
  subject,
  remainingFree,
  paidDemoPrice,
  reloadBalance,
}: Args) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  const selectionLabel = formatSelection(selectedDate, selectedHour);

  async function handleBookDemo() {
    if (!selectedStudentId) {
      setBookingError("Pick which child this demo is for.");
      return;
    }

    // A demo has to be arranged for a specific time — date and
    // time selection is now required, not optional, before booking.
    if (!selectedDate || selectedHour == null) {
      setBookingError(
        "Pick a date and time from the calendar below before booking.",
      );
      return;
    }

    setBooking(true);
    setBookingError("");
    setBookingSuccess(null);

    try {
      const scheduledAt = toIstIso(selectedDate, selectedHour);

      const payload = {
        studentId: selectedStudentId,
        teacherId,
        courseId,
        subject,
        scheduledAt,
      };

      if (remainingFree > 0) {
        // Free demo — no Razorpay involved.
        const res = await fetch("/api/parent/demo-bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to book demo.");
        }

        setBookingSuccess(
          "Free demo booked! We'll be in touch to confirm the time.",
        );
        reloadBalance();
        return;
      }

      // Paid demo — create a Razorpay order, open Checkout, verify.
      // UPI adds a transaction charge, so ask BEFORE the order is created.
      const paymentMethod = await askPaymentMethod({ baseAmount: paidDemoPrice });

      if (!paymentMethod) {
        setBookingError("Payment cancelled — no charge was made.");
        return;
      }

      const orderRes = await fetch("/api/parent/demo-bookings/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, paymentMethod }),
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
        paymentMethod,
        name: "Learnie",
        description: `Demo — ₹${paidDemoPrice}`,
      });

      if (!result) {
        // User closed the payment window without paying.
        setBookingError("Payment cancelled — no charge was made.");
        return;
      }

      const verifyRes = await fetch("/api/parent/demo-bookings/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          razorpayOrderId: result.razorpay_order_id,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpaySignature: result.razorpay_signature,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Payment succeeded but booking could not be confirmed — contact support.");
      }

      setBookingSuccess(`Payment received — demo booked for ₹${paidDemoPrice}.`);
      reloadBalance();
    } catch (err) {
      setBookingError(
        err instanceof Error ? err.message : "Failed to book demo.",
      );
    } finally {
      setBooking(false);
    }
  }

  return {
    selectedDate,
    selectedHour,
    selectionLabel,
    booking,
    bookingError,
    bookingSuccess,
    onSelectDate: (date: Date | null) => {
      setSelectedDate(date);
      setSelectedHour(null);
    },
    onSelectHour: setSelectedHour,
    handleBookDemo,
  };
}
