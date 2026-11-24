"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { useAdminIdentity } from "@/features/admin/components/ui/AdminIdentityContext";
import {
  ADMIN_CARD_FLUSH,
  ADMIN_SECTION_H2,
  adminBtn,
  adminTag,
  cx,
} from "@/features/admin/components/ui/adminStyles";
import {
  OTHER_QUEUES,
  PRIORITY_QUEUES,
  navItemForQueue,
} from "@/features/admin/config/overviewQueues";
import type { AdminQueueCounts } from "@/features/admin/types/queueCounts";

interface CountsProps {
  counts: AdminQueueCounts | null;
}

const QUEUE_TOTAL = PRIORITY_QUEUES.length + OTHER_QUEUES.length;

export function waitingTotal(counts: AdminQueueCounts | null) {
  if (!counts) return null;

  return [...PRIORITY_QUEUES, ...OTHER_QUEUES].reduce((sum, queue) => sum + counts[queue.countKey], 0);
}

export function OverviewHeading({ counts }: CountsProps) {
  const total = waitingTotal(counts);
  const identity = useAdminIdentity();
  const firstName = identity?.firstName.trim();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-[28px] font-semibold leading-tight text-balance outline-none sm:text-[32px]">
          <span suppressHydrationWarning>{greeting}</span>, {firstName || "Admin"}
        </h1>
        <p className="mt-0.5 max-w-[62ch] text-[14px] text-pd-ink3">
          {total === null
            ? "Checking what is waiting for you…"
            : `${total} ${total === 1 ? "item is" : "items are"} waiting for a decision across ${QUEUE_TOTAL} queues.`}
        </p>
      </div>
    </div>
  );
}

export function OverviewHero({ counts }: CountsProps) {
  const total = waitingTotal(counts);
  // Send Admin to the first big queue that actually has something in it.
  const firstBusy = counts ? PRIORITY_QUEUES.find((queue) => counts[queue.countKey] > 0) : undefined;
  const target = navItemForQueue((firstBusy ?? PRIORITY_QUEUES[0]).countKey);

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-pd-brand p-7 text-white sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-[14px] font-bold opacity-90">
          <i className="size-2 rounded-full bg-pd-gold" aria-hidden="true" />
          Waiting for your decision
        </div>
        <div className="font-heading text-[56px] font-semibold leading-none">
          {total ?? "–"}
          <small className="ml-2 font-sans text-[18px] font-semibold leading-[1.2] opacity-90">
            across {QUEUE_TOTAL} queues
          </small>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:items-end">
        <Link href={target.href} className={adminBtn("go")}>
          Start with {target.label.toLowerCase()}
        </Link>
        <Link href="/admin/activity-logs" className={adminBtn("alt")}>
          Open activity log
        </Link>
      </div>
    </div>
  );
}

export function PriorityQueues({ counts }: CountsProps) {
  return (
    <section aria-labelledby="h-review">
      <h2 id="h-review" className={ADMIN_SECTION_H2}>
        Needs your review first
      </h2>

      <div className={ADMIN_CARD_FLUSH}>
        {PRIORITY_QUEUES.map((queue, index) => {
          const item = navItemForQueue(queue.countKey);
          const hot = index === 0;

          return (
            <div
              key={queue.countKey}
              className={cx(
                "flex flex-wrap items-center gap-3 px-4",
                hot ? "border-l-4 border-[#d97706] bg-[#fffbf2] py-[18px]" : "border-t border-pd-line py-3.5",
              )}
            >
              <span className="grid h-[30px] min-w-[30px] place-items-center rounded-full bg-pd-amber-bg px-2 font-bold text-pd-amber">
                {counts ? counts[queue.countKey] : "–"}
              </span>
              <div className="min-w-0 flex-[1_1_220px]">
                <b className={cx("block font-heading font-semibold", hot ? "text-[20px]" : "text-[17px]")}>
                  {item.label}
                </b>
                <small className="block text-[13px] text-pd-ink3">{queue.note}</small>
              </div>
              <Link href={item.href} className={adminBtn(hot ? "pri" : "sec", hot ? "md" : "sm")}>
                Open queue
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function OtherQueues({ counts }: CountsProps) {
  return (
    <section aria-labelledby="h-queues">
      <h2 id="h-queues" className={ADMIN_SECTION_H2}>
        Other queues
      </h2>

      <div className={ADMIN_CARD_FLUSH}>
        {OTHER_QUEUES.map((queue) => {
          const item = navItemForQueue(queue.countKey);
          const Icon = item.icon;

          return (
            <Link
              key={queue.countKey}
              href={item.href}
              className="flex w-full items-center gap-3 border-t border-pd-line px-5 py-3.5 text-left transition-colors first:border-t-0 hover:bg-pd-b50"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-pd-b50 text-pd-brand">
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-[15px] font-semibold">{item.label}</b>
                <small className="block text-[13px] text-pd-ink3">{queue.note}</small>
              </span>
              <span className={adminTag("amber")}>{counts ? counts[queue.countKey] : "–"}</span>
              <ChevronRight size={18} aria-hidden="true" className="text-pd-ink3" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
