"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import AdminNav from "@/features/admin/components/ui/AdminNav";
import { ADMIN_FOCUS, cx } from "@/features/admin/components/ui/adminStyles";
import type { AdminQueueCounts } from "@/features/admin/types/queueCounts";

interface AdminMoreSheetProps {
  open: boolean;
  onClose: () => void;
  pathname: string;
  counts: AdminQueueCounts | null;
  openGroups: ReadonlySet<string>;
  onToggleGroup: (label: string) => void;
}

/**
 * "All screens" dialog opened from the phone bottom bar. Uses the native
 * <dialog>, so focus is trapped and Escape closes it without extra code.
 */
export default function AdminMoreSheet({
  open,
  onClose,
  pathname,
  counts,
  openGroups,
  onToggleGroup,
}: AdminMoreSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;

    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const profileActive = pathname === "/admin/profile";

  return (
    <dialog
      ref={ref}
      aria-labelledby="admin-sheet-title"
      onClose={onClose}
      onClick={(event) => {
        // A click on the dimmed backdrop lands on the <dialog> element itself.
        if (event.target === ref.current) onClose();
      }}
      className="m-auto max-h-[calc(100dvh-32px)] w-[min(480px,calc(100vw-32px))] overflow-auto rounded-2xl border-0 bg-white p-0 text-pd-ink shadow-[0_16px_40px_-12px_rgba(23,23,43,0.35)] backdrop:bg-[rgba(28,24,51,0.5)] open:animate-pop-in"
    >
      {open && (
        <>
          <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
            <h2 id="admin-sheet-title" className="font-heading text-[20px] font-semibold">
              All screens
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cx(
                "relative grid size-11 place-items-center rounded-[10px] text-pd-ink2 hover:bg-pd-b50 hover:text-pd-brand",
                ADMIN_FOCUS,
              )}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="px-5 pb-5">
            <AdminNav
              pathname={pathname}
              counts={counts}
              openGroups={openGroups}
              onToggleGroup={onToggleGroup}
              onNavigate={onClose}
            />
            <Link
              href="/admin/profile"
              onClick={onClose}
              aria-current={profileActive ? "page" : undefined}
              className={cx(
                "relative mt-0.5 flex w-full items-center gap-3 rounded-[10px] px-3 py-[9px] text-left text-[14px] transition-colors duration-150",
                profileActive
                  ? "bg-pd-b50 font-semibold text-pd-brand-d before:absolute before:-left-3 before:bottom-[9px] before:top-[9px] before:w-[3px] before:rounded-r-[3px] before:bg-pd-brand"
                  : "font-medium text-pd-ink2 hover:bg-pd-bg",
                ADMIN_FOCUS,
              )}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={profileActive ? "text-pd-brand" : ""}
              >
                <circle cx="9" cy="7" r="4" />
              </svg>
              <span>My profile</span>
            </Link>
          </div>
        </>
      )}
    </dialog>
  );
}
