"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

import { Modal } from "@/components/ui/modal";

interface PdDialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Buttons, right-aligned (design `.df.inline`). */
  footer?: ReactNode;
}

/**
 * Dashboard-design dialog (title + close, body, right-aligned buttons) on top
 * of the shared `Modal` shell, so it keeps Escape-to-close, the focus trap and
 * scroll lock. On phones it sits at the bottom of the screen as a sheet.
 * Mount it only while open: `{open && <PdDialog …>}`.
 */
export default function PdDialog({ title, onClose, children, footer }: PdDialogProps) {
  return (
    <Modal
      onClose={onClose}
      label={title}
      backdropClassName="bg-[rgba(28,24,51,0.5)]"
      panelClassName="max-w-[480px] rounded-2xl bg-white text-pd-ink shadow-[0_16px_40px_-12px_rgba(23,23,43,0.28)] max-sm:bottom-0 max-sm:left-0 max-sm:top-auto max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none"
    >
      <div className="flex items-start justify-between gap-3 px-6 pb-3 pt-6">
        <h2 className="font-heading text-xl font-semibold leading-tight">{title}</h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="-mr-2 -mt-1.5 grid size-10 shrink-0 place-items-center rounded-[10px] text-pd-ink2 transition-colors hover:bg-pd-b50 hover:text-pd-brand"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex flex-col gap-4 px-6 pb-4 text-sm">{children}</div>

      {footer && <div className="flex flex-wrap justify-end gap-2 px-6 pb-6 pt-3">{footer}</div>}
    </Modal>
  );
}
