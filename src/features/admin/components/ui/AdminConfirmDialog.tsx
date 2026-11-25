"use client";

import { useState, type ReactNode } from "react";

import { adminBtn } from "@/features/admin/components/ui/adminStyles";
import { AdminErrorNote } from "@/features/admin/components/ui/design";
import PdDialog from "@/features/shared/components/PdDialog";

interface Props {
  title: string;
  /** What the action does (design: one or two sentences). */
  children: ReactNode;
  confirmLabel: string;
  /** Red confirm button for destructive actions. */
  danger?: boolean;
  onCancel: () => void;
  /** Resolve with an error message to keep the dialog open, or null when done. */
  onConfirm: () => Promise<string | null>;
}

/**
 * Admin confirm dialog from the design (`dlg()` without a reason box):
 * title, short text, Cancel + confirm. Shared by every Admin screen that
 * only needs a yes/no (Manage users delete now). For decisions that need a
 * written reason use `AdminReasonDialog` instead.
 * Mount it only while open: `{open && <AdminConfirmDialog … />}`.
 */
export default function AdminConfirmDialog({
  title,
  children,
  confirmLabel,
  danger = false,
  onCancel,
  onConfirm,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");

    const message = await onConfirm();

    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  return (
    <PdDialog
      title={title}
      onClose={busy ? () => {} : onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} disabled={busy} className={adminBtn("sec")}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
            className={adminBtn(danger ? "dng" : "pri")}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </>
      }
    >
      <AdminErrorNote>{error}</AdminErrorNote>
      {children}
    </PdDialog>
  );
}
