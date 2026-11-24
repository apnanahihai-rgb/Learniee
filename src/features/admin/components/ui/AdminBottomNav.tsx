"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import { ADMIN_BOTTOM_NAV, isNavItemActive } from "@/features/admin/config/adminNav";
import type { AdminQueueCounts } from "@/features/admin/types/queueCounts";
import { ADMIN_FOCUS, cx } from "@/features/admin/components/ui/adminStyles";

interface AdminBottomNavProps {
  pathname: string;
  counts: AdminQueueCounts | null;
  onOpenMore: () => void;
}

/** Phone / tablet bottom bar: four shortcuts + "More" (hidden from 1024px up). */
export default function AdminBottomNav({ pathname, counts, onOpenMore }: AdminBottomNavProps) {
  const onShortcut = ADMIN_BOTTOM_NAV.some(({ item }) => isNavItemActive(item, pathname));

  const itemClass = (active: boolean) =>
    cx(
      "relative flex flex-col items-center gap-0.5 rounded-[10px] py-1.5 text-xs",
      active ? "font-semibold text-pd-brand" : "font-medium text-pd-ink3",
      ADMIN_FOCUS,
    );

  return (
    <nav
      aria-label="Admin"
      className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-pd-line bg-white px-1 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] lg:hidden"
    >
      {ADMIN_BOTTOM_NAV.map(({ label, item }) => {
        const active = isNavItemActive(item, pathname);
        const count = item.countKey && counts ? counts[item.countKey] : 0;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={itemClass(active)}
          >
            <Icon size={22} aria-hidden="true" />
            <span>{label}</span>
            {count > 0 && (
              <i className="absolute left-[calc(50%+6px)] top-px h-4 min-w-4 rounded-full bg-pd-red px-1 text-center text-[10px] font-bold not-italic leading-4 text-white">
                {count}
              </i>
            )}
          </Link>
        );
      })}

      <button type="button" onClick={onOpenMore} className={itemClass(!onShortcut)}>
        <Menu size={22} aria-hidden="true" />
        <span>More</span>
      </button>
    </nav>
  );
}
