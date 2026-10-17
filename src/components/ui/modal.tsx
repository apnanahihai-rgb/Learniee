"use client";

import type { ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";

import { cn } from "@/lib/utils";

interface ModalProps {
  /** Called on Escape, a backdrop click, or when focus handling asks to dismiss. */
  onClose: () => void;
  /** Accessible name announced by screen readers. */
  label: string;
  children: ReactNode;
  /** "center" = confirmation dialog, "right" = full-height side panel. */
  variant?: "center" | "right";
  /** Extra classes for the dim layer (colour). */
  backdropClassName?: string;
  /** Extra classes for the panel itself (width, background, radius, padding). */
  panelClassName?: string;
}

/**
 * Shared modal shell. Mount it only while open (`{open && <Modal …>}`); it is
 * always open while mounted. Gives every dialog Escape-to-close, a focus trap,
 * page scroll lock, correct dialog semantics and a short ease-out enter
 * (200ms centre / 250ms side panel; fade only for reduced motion).
 * Exit is instant by design: the caller unmounts it.
 */
export function Modal({
  onClose,
  label,
  children,
  variant = "center",
  backdropClassName = "bg-black/40",
  panelClassName,
}: ModalProps) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-50 transition-opacity duration-200 ease-out data-starting-style:opacity-0 motion-reduce:duration-150",
            backdropClassName,
          )}
        />
        <Dialog.Popup
          aria-label={label}
          className={cn(
            "fixed z-50 overflow-y-auto overscroll-contain outline-none",
            variant === "center"
              ? "left-1/2 top-1/2 max-h-[90dvh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 transition-[opacity,scale] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:data-starting-style:scale-100"
              : "right-0 top-0 h-dvh w-full transition-transform duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-starting-style:translate-x-full motion-reduce:transition-none motion-reduce:data-starting-style:translate-x-0",
            panelClassName,
          )}
        >
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
