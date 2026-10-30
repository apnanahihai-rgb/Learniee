"use client";

import Link from "next/link";
import { Check, Plus } from "lucide-react";

import {
  formatINR,
  initialOf,
  kidColor,
  kidFirstName,
  shortSubject,
} from "@/features/parent/components/dashboard/dashboardUtils";
import type { DashboardClass, DashboardKid } from "@/features/parent/types/dashboard";

/** Renewals are listed this many days ahead (the Renew button itself opens 7 days out). */
const LOOKAHEAD_DAYS = 14;

interface Props {
  kids: DashboardKid[];
  classes: DashboardClass[];
  balance: number;
  freeDemosLeft: number;
}

/** Wallet balance, free demos left and the renewals the balance has to cover. */
export default function WalletRenewalsCard({ kids, classes, balance, freeDemosLeft }: Props) {
  const due = classes
    .filter((c) => c.status === "enrolled" && c.daysLeft !== null && c.daysLeft <= LOOKAHEAD_DAYS)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));
  const total = due.reduce((sum, c) => sum + c.renewalAmount, 0);
  const gap = Math.max(0, total - balance);
  const prominent = gap > 0 || balance < 1000;

  return (
    <section
      aria-label="Wallet and renewals"
      className="flex flex-col gap-1.5 rounded-[18px] border border-[#ebe8f3] bg-white p-[18px]"
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#7d7998]">Wallet</span>
        <span className="rounded-full bg-[#f6f1ff] px-2.5 py-0.5 text-xs font-semibold text-[#5b1fb0]">
          {freeDemosLeft} free demo{freeDemosLeft === 1 ? "" : "s"} left
        </span>
      </div>

      <div className="font-heading text-[30px] font-bold leading-tight tracking-tight">
        {formatINR(balance)}
      </div>

      {due.length > 0 && (
        <>
          <p className="mt-2.5 text-xs font-semibold text-[#7d7998]">Renewals in the next 2 weeks</p>
          <ul className="flex flex-col">
            {due.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2.5 border-t border-[#ebe8f3] py-2 text-[13px] first:border-t-0"
              >
                <span
                  className="grid size-5 place-items-center rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: kidColor(kids, c.studentId) }}
                >
                  {initialOf(kidFirstName(kids, c.studentId))}
                </span>
                <span className="flex min-w-0 flex-1 flex-col leading-snug">
                  <span>
                    <b className="font-semibold">{shortSubject(c.subject || c.title)}</b> ·{" "}
                    {kidFirstName(kids, c.studentId)}
                  </span>
                  <small className="text-xs text-[#7d7998]">
                    {c.daysLeft !== null && c.daysLeft <= 0
                      ? "ends today"
                      : `in ${c.daysLeft} day${c.daysLeft === 1 ? "" : "s"}`}
                  </small>
                </span>
                <em className="font-semibold not-italic">{formatINR(c.renewalAmount)}</em>
              </li>
            ))}
          </ul>
        </>
      )}

      {due.length === 0 ? (
        <p className="my-1 flex items-center gap-1.5 text-[13px] font-semibold text-[#15803d]">
          <Check size={14} strokeWidth={3} />
          No renewals due in the next 2 weeks.
        </p>
      ) : gap > 0 ? (
        <p className="my-1 rounded-[10px] bg-[#fef3c7] px-3 py-2 text-[13px] font-semibold text-[#b45309]">
          {formatINR(gap)} more needed to cover these renewals.
        </p>
      ) : (
        <p className="my-1 flex items-center gap-1.5 text-[13px] font-semibold text-[#15803d]">
          <Check size={14} strokeWidth={3} />
          Your balance covers these renewals.
        </p>
      )}

      <Link
        href="/parent/wallet"
        className={
          prominent
            ? "inline-flex h-9 items-center justify-center gap-2 rounded-full bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand-dark"
            : "inline-flex items-center gap-2 self-start rounded-lg px-2 py-1 text-sm font-semibold text-brand hover:bg-[#f6f1ff]"
        }
      >
        <Plus size={14} />
        Add money
      </Link>
    </section>
  );
}
