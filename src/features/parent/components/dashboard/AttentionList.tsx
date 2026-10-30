"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import type { DashboardAttention } from "@/features/parent/types/dashboard";

const LABEL: Record<DashboardAttention["kind"], string> = {
  RESCHEDULE: "Reschedule",
  SURVEY: "Demo feedback",
  RECONFIRM: "Schedule",
  RENEW: "Renewal",
};

interface Props {
  items: DashboardAttention[];
}

/**
 * "Needs your attention": the few things only the parent can unblock
 * (answer a reschedule, rate a demo, renew a cycle). The first row is
 * highlighted; more than three collapse behind "Show more".
 */
export default function AttentionList({ items }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (items.length === 0) {
    return (
      <p className="mx-0.5 flex items-center gap-2 text-[13px] text-[#7d7998]">
        <Check size={16} strokeWidth={2.5} className="text-[#15803d]" />
        Nothing needs your attention right now
      </p>
    );
  }

  const shown = showAll ? items : items.slice(0, 3);

  return (
    <section aria-labelledby="dash-attention">
      <h2
        id="dash-attention"
        className="mb-3 flex items-center justify-between gap-3 font-heading text-lg font-semibold"
      >
        <span className="flex items-center gap-2">
          Needs your attention
          <span className="rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-xs font-semibold text-[#b45309]">
            {items.length}
          </span>
        </span>
      </h2>

      <div className="overflow-hidden rounded-[14px] border border-[#ebe8f3] bg-white">
        {shown.map((x, i) => {
          const hot = i === 0;
          const violet = x.kind === "RENEW" || x.kind === "SURVEY";

          return (
            <div
              key={x.key}
              className={`flex flex-wrap items-center justify-between gap-3 border-t border-[#ebe8f3] px-4 first:border-t-0 ${
                hot
                  ? `border-l-4 py-4 ${violet ? "border-l-brand bg-[#faf8ff]" : "border-l-[#d97706] bg-[#fffbf2]"}`
                  : "py-3"
              }`}
            >
              <div className="min-w-[200px] flex-1">
                <span className="sr-only">{LABEL[x.kind]}: </span>
                <b className={`block font-heading font-semibold ${hot ? "text-xl" : "text-[17px]"}`}>
                  {x.title}
                </b>
                <small className="block text-[13px] text-[#7d7998]">{x.subtitle}</small>
              </div>

              <Link
                href={x.href}
                className={`inline-flex h-9 shrink-0 items-center rounded-full px-4 text-[13px] font-semibold ${
                  hot
                    ? "bg-brand text-white hover:bg-brand-dark"
                    : "bg-[#f6f1ff] text-[#5b1fb0] hover:bg-[#ece1fe]"
                }`}
              >
                {x.ctaLabel}
              </Link>
            </div>
          );
        })}
      </div>

      {items.length > 3 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2.5 rounded-lg px-2 py-1 text-sm font-semibold text-brand hover:bg-[#f6f1ff]"
        >
          {showAll ? "Show less" : `Show ${items.length - 3} more`}
        </button>
      )}
    </section>
  );
}
