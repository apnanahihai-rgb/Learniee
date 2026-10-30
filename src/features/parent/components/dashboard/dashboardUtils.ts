"use client";

import { useEffect, useState } from "react";

import type { DashboardKid } from "@/features/parent/types/dashboard";
import { getInitial } from "@/lib/initials";

/** One colour per learner, by position, so a child keeps their colour everywhere on the page. */
const KID_COLORS = ["#0f766e", "#c2410c", "#be185d", "#1d4ed8", "#4d7c0f", "#a16207"];

export function kidColor(kids: DashboardKid[], studentId: string | null | undefined): string {
  const i = kids.findIndex((k) => k.id === studentId);

  return i >= 0 ? KID_COLORS[i % KID_COLORS.length] : "#7e2bf1";
}

export function kidFirstName(kids: DashboardKid[], studentId: string | null | undefined): string {
  return kids.find((k) => k.id === studentId)?.name ?? "";
}

export function initialOf(name: string): string {
  return getInitial(name);
}

const SUBJECT_SHORT: Record<string, string> = {
  Mathematics: "Maths",
  Chemistry: "Chem",
  Physics: "Phys",
  Biology: "Bio",
  "Computer Science": "CS",
};

export function shortSubject(subject: string): string {
  return SUBJECT_SHORT[subject] ?? subject;
}

export function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/** "6:00 PM" */
export function formatTime(date: Date): string {
  return date
    .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
    .toUpperCase();
}

/** Whole calendar days from `now` to `date` in the device's timezone (0 = today). */
export function dayDiff(date: Date, now: Date): number {
  const a = new Date(now);
  const b = new Date(date);

  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);

  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** "Today", "Tomorrow" or "Thu, 5 Nov". */
export function dayLabel(date: Date, now: Date): string {
  const n = dayDiff(date, now);

  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";

  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Re-renders every `everyMs` and returns the server-corrected "now" in ms
 * (`skewMs` = server clock minus device clock), so countdowns and Join
 * buttons agree with the server even on a device with a wrong clock.
 */
export function useServerNow(skewMs: number, everyMs = 15_000): number {
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), everyMs);

    return () => window.clearInterval(id);
  }, [everyMs]);

  return tick + skewMs;
}

/** Join opens this long before a class (mirrors `SESSION_POLICY.joinOpensMinutesBefore`). */
export const JOIN_OPENS_MINUTES = 10;
