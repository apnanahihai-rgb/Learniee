"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ADMIN_NAV, isNavItemActive } from "@/features/admin/config/adminNav";
import type { AdminQueueCounts } from "@/features/admin/types/queueCounts";
import { ADMIN_FOCUS, cx } from "@/features/admin/components/ui/adminStyles";

interface AdminNavProps {
  pathname: string;
  counts: AdminQueueCounts | null;
  openGroups: ReadonlySet<string>;
  onToggleGroup: (label: string) => void;
  onNavigate?: () => void;
}

const COUNT_PILL =
  "h-5 min-w-5 rounded-full bg-pd-amber-bg px-1.5 text-center text-[11px] font-bold leading-5 text-pd-amber";

/**
 * Sidebar menu with collapsible groups, exactly as in the Admin design.
 * Shared by the desktop sidebar and the phone "All screens" sheet. The
 * group holding the current page is opened by the shell; Admin can open
 * or close any group, and a closed group shows the total waiting inside.
 */
export default function AdminNav({
  pathname,
  counts,
  openGroups,
  onToggleGroup,
  onNavigate,
}: AdminNavProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {ADMIN_NAV.map((group, index) => {
        const links = group.items.map((item) => {
          const active = isNavItemActive(item, pathname);
          const count = item.countKey && counts ? counts[item.countKey] : 0;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cx(
                "relative flex w-full items-center gap-3 rounded-[10px] px-3 py-[9px] text-left text-[14px] transition-colors duration-150",
                active
                  ? "bg-pd-b50 font-semibold text-pd-brand-d before:absolute before:-left-3 before:bottom-[9px] before:top-[9px] before:w-[3px] before:rounded-r-[3px] before:bg-pd-brand"
                  : "font-medium text-pd-ink2 hover:bg-pd-bg",
                ADMIN_FOCUS,
              )}
            >
              <Icon size={20} strokeWidth={2} aria-hidden="true" className={active ? "text-pd-brand" : ""} />
              <span>{item.label}</span>
              {count > 0 && (
                <span aria-label={`${count} waiting`} className={cx("ml-auto", COUNT_PILL)}>
                  {count}
                </span>
              )}
            </Link>
          );
        });

        // The unlabeled first group is just "Overview": a plain link.
        if (!group.label) return <div key={`group-${index}`}>{links}</div>;

        const open = openGroups.has(group.label);
        const total = counts
          ? group.items.reduce((sum, item) => sum + (item.countKey ? counts[item.countKey] : 0), 0)
          : 0;

        return (
          <div key={group.label} className="mt-1">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => onToggleGroup(group.label)}
              className={cx(
                "flex w-full items-center gap-2 rounded-[10px] px-3 py-[9px] text-left text-[13px] font-bold text-pd-ink2 transition-colors duration-150 hover:bg-pd-bg",
                ADMIN_FOCUS,
              )}
            >
              <span className="flex-1">{group.label}</span>
              {!open && total > 0 && (
                <span title={`${total} waiting`} className={COUNT_PILL}>
                  {total}
                </span>
              )}
              <ChevronRight
                size={16}
                aria-hidden="true"
                className={cx("text-pd-ink3 transition-transform duration-200", open && "rotate-90")}
              />
            </button>

            {open && <div className="flex flex-col gap-0.5 pb-1.5 pt-0.5">{links}</div>}
          </div>
        );
      })}
    </div>
  );
}
