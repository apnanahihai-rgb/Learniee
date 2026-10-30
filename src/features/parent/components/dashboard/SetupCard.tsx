"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { DashboardSetup } from "@/features/parent/types/dashboard";

const SIZE = 40;
const STROKE = 5;

/** One tile pointing at the next unfinished setup step; gone once all are done. */
export default function SetupCard({ setup }: { setup: DashboardSetup | null }) {
  if (!setup) return null;

  const pct = Math.round((setup.done / setup.total) * 100);
  const r = (SIZE - 7) / 2;
  const c = 2 * Math.PI * r;
  const h = SIZE / 2;

  return (
    <Link
      href={setup.href}
      className="flex w-full items-center gap-3 rounded-[14px] border border-[#ebe8f3] bg-white px-3.5 py-3 text-left hover:border-[#ddd8ea]"
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden className="shrink-0">
        <circle cx={h} cy={h} r={r} fill="none" stroke="#ece1fe" strokeWidth={STROKE} />
        <circle
          cx={h}
          cy={h}
          r={r}
          fill="none"
          stroke="#7e2bf1"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${(c * pct) / 100} ${c}`}
          transform={`rotate(-90 ${h} ${h})`}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="11"
          fontWeight="600"
          fill="currentColor"
        >
          {pct}%
        </text>
      </svg>

      <span className="flex min-w-0 flex-1 flex-col">
        <b className="text-sm font-semibold">{setup.nextLabel}</b>
        <small className="text-xs text-[#7d7998]">
          {setup.done} of {setup.total} steps done
        </small>
      </span>

      <ChevronRight size={18} className="text-[#7d7998]" />
    </Link>
  );
}
