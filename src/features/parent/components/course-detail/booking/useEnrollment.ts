"use client";

import { useMemo, useState } from "react";

import { openRazorpayCheckout } from "@/lib/loadRazorpayCheckout";
import {
  buildCyclePlan,
  getCyclePlanProblem,
  priceForSessions,
  type PlanType,
} from "@/features/shared/utils/cyclePlan";
import { toggleWeekday } from "@/features/shared/utils/weekdays";
import { toDateKey, todayInPlatformTz } from "@/lib/platformTime";
import { useWalletBalance } from "@/features/parent/hooks/useWalletBalance";

interface Args {
  price: string | null;
  selectedStudentId: string;
  teacherId: string;
  courseId: string;
  subject: string | null;
}

/** Cycle plan form state, the client-side price preview and the paid enrollment flow. */
export function useEnrollment({
  price,
  selectedStudentId,
  teacherId,
  courseId,
  subject,
}: Args) {
  // Enroll — separate from the demo-booking state above since a
  // parent may enroll without booking another demo first (they
  // might already be past their demos for this teacher/subject).
  // Cycle start date ("YYYY-MM-DD", platform timezone) — defaults to today.
  const [startDate, setStartDate] = useState(() =>
    toDateKey(todayInPlatformTz()),
  );
  // Recurring weekly schedule — required before enrolling so the
  // teacher/parent calendar can actually show something real.
  // MONTHLY = plan the whole month ahead; WEEKLY = one week at a
  // time, renewed every week.
  const [planType, setPlanType] = useState<PlanType>("MONTHLY");
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [scheduleTime, setScheduleTime] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);
  const [enrollChatRoomId, setEnrollChatRoomId] = useState<string | null>(null);
  const { balance: walletBalance, reload: reloadWallet } = useWalletBalance();

  // Client-side preview only — the authoritative calculation always
  // happens server-side in enrollment.service.ts, using this same
  // `buildCyclePlan()`. Rate is a PER-SESSION rate.
  const ratePerSession = price ? Number(price) : null;
  const minStartDate = toDateKey(todayInPlatformTz());
  const startInPast = !!startDate && startDate < minStartDate;

  const cyclePlan = useMemo(
    () =>
      startDate && scheduleDays.length > 0
        ? buildCyclePlan(startDate, scheduleDays, planType)
        : null,
    [startDate, scheduleDays, planType],
  );
  const planProblem = cyclePlan ? getCyclePlanProblem(cyclePlan) : null;

  const pricePreview = useMemo(() => {
    if (!ratePerSession || !cyclePlan || planProblem) return null;

    return {
      sessionCount: cyclePlan.sessionCount,
      totalAmount: priceForSessions(ratePerSession, cyclePlan.sessionCount),
    };
  }, [ratePerSession, cyclePlan, planProblem]);

  function toggleScheduleDay(day: number) {
    setScheduleDays((current) => toggleWeekday(current, day));
  }

  /** Shared by the card and wallet flows. Returns an error message, or null when OK. */
  function getEnrollProblem(): string | null {
    if (!selectedStudentId) return "Pick which child this enrollment is for.";

    if (scheduleDays.length === 0 || !scheduleTime) {
      return "Pick which days and what time classes should happen.";
    }

    if (!startDate || startInPast) return "Pick a start date that isn't in the past.";

    if (!cyclePlan || planProblem) return planProblem ?? "Pick a valid start date.";

    return null;
  }

  /** Card flow. With `useWallet`, the Wallet pays what it can and the card pays the rest (06 #44). */
  async function runCardEnrollment(useWallet: boolean) {
    const problem = getEnrollProblem();

    if (problem) {
      setEnrollError(problem);
      return;
    }

    setEnrolling(true);
    setEnrollError("");
    setEnrollSuccess(null);

    try {
      const payload = {
        studentId: selectedStudentId,
        teacherId,
        courseId,
        subject,
        planType,
        cycleStartDate: startDate,
        scheduleDays,
        scheduleTime,
      };

      const orderRes = await fetch("/api/parent/enrollments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, useWallet }),
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
        description:
          `Enrollment — ₹${orderData.pricing.totalAmount.toLocaleString("en-IN")}` +
          (orderData.pricing.walletAmount > 0
            ? ` (₹${Number(orderData.pricing.walletAmount).toLocaleString("en-IN")} from wallet)`
            : ""),
      });

      if (!result) {
        setEnrollError("Payment cancelled — no charge was made.");
        return;
      }

      const verifyRes = await fetch("/api/parent/enrollments/verify", {
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
        throw new Error(verifyData.error || "Payment succeeded but enrollment could not be confirmed — contact support.");
      }

      setEnrollSuccess(
        "Payment successful! Your enrollment is on its way — you can connect with your teacher over chat any time.",
      );
      setEnrollChatRoomId(verifyData.enrollment?.chatRoom?.id ?? null);
      reloadWallet();
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : "Failed to enroll.");
    } finally {
      setEnrolling(false);
    }
  }

  const handleEnroll = () => runCardEnrollment(false);
  const handleEnrollPartWallet = () => runCardEnrollment(true);

  /**
   * Pays the whole price from the Wallet balance (06 #44). `requestId` makes a
   * double click / retry safe on the server.
   */
  async function handleEnrollWithWallet() {
    const problem = getEnrollProblem();

    if (problem) {
      setEnrollError(problem);
      return;
    }

    setEnrolling(true);
    setEnrollError("");
    setEnrollSuccess(null);

    try {
      const res = await fetch("/api/parent/enrollments/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          studentId: selectedStudentId,
          teacherId,
          courseId,
          subject,
          planType,
          cycleStartDate: startDate,
          scheduleDays,
          scheduleTime,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to pay from your wallet.");
      }

      setEnrollSuccess(
        "Paid from your wallet! Your enrollment is on its way — you can connect with your teacher over chat any time.",
      );
      setEnrollChatRoomId(data.enrollment?.chatRoom?.id ?? null);
      reloadWallet();
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : "Failed to pay from your wallet.");
    } finally {
      setEnrolling(false);
    }
  }

  return {
    planType,
    setPlanType,
    startDate,
    setStartDate,
    minStartDate,
    startInPast,
    scheduleDays,
    toggleScheduleDay,
    scheduleTime,
    setScheduleTime,
    ratePerSession,
    cyclePlan,
    planProblem,
    pricePreview,
    enrolling,
    enrollError,
    enrollSuccess,
    enrollChatRoomId,
    handleEnroll,
    handleEnrollWithWallet,
    handleEnrollPartWallet,
    walletBalance,
  };
}
