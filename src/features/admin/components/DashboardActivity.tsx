"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ADMIN_CARD_FLUSH, ADMIN_SECTION_H2 } from "@/features/admin/components/ui/adminStyles";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";

interface ActivityItem {
  id: string;
  description: string;
  createdAt: string;
}

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

/** Latest few Activity Log lines for the Overview screen. Best-effort. */
export default function DashboardActivity() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/activity-logs?pageSize=5", { cache: "no-store" });
      const data = res.ok ? await res.json() : null;

      if (data) {
        setItems(Array.isArray(data.items) ? data.items : []);
      } else {
        // Keep what is already on screen if a refresh fails.
        setItems((prev) => prev ?? []);
      }
    } catch {
      setItems((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: ["/api/admin/activity-logs"] });

  return (
    <section aria-labelledby="h-activity" className="min-w-0">
      <h2 id="h-activity" className={ADMIN_SECTION_H2}>
        Recent activity
        <Link
          href="/admin/activity-logs"
          className="font-sans text-[13px] font-semibold leading-[1.4] text-pd-brand hover:underline"
        >
          Open log
        </Link>
      </h2>

      <div className={ADMIN_CARD_FLUSH}>
        {items === null ? (
          <p role="status" className="px-5 py-3.5 text-[14px] text-pd-ink3">
            Loading…
          </p>
        ) : items.length === 0 ? (
          <p className="px-5 py-3.5 text-[14px] text-pd-ink3">No activity yet.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex w-full items-center gap-3 border-t border-pd-line px-5 py-3.5 first:border-t-0"
            >
              <i className="size-2.5 shrink-0 rounded-full bg-pd-brand" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-[14px] font-semibold">{item.description}</span>
              <span className="shrink-0 text-[13px] text-pd-ink3">{timeAgo(item.createdAt)}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
