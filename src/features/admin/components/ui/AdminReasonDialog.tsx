"use client";

import { useState, type ReactNode } from "react";

import { adminBtn } from "@/features/admin/components/ui/adminStyles";
import { AdminErrorNote } from "@/features/admin/components/ui/design";
import PdDialog from "@/features/shared/components/PdDialog";

const REASON_MIN = 5;
const REASON_MAX = 500;

interface Props {
  title: string;
  /** One or two sentences under the title, e.g. what the decision does. */
  description?: ReactNode;
  confirmLabel: string;
  /** Red confirm button for destructive decisions. */
  danger?: boolean;
  label?: string;
  hint?: ReactNode;
  /** Set when the server would refuse the action: shown in red and the confirm button is disabled. */
  blockedReason?: string | null;
  onCancel: () => void;
  /** Resolve with an error message to keep the dialog open, or null when saved. */
  onSubmit: (reason: string) => Promise<string | null>;
}

/**
 * Admin "reason" dialog from the design (`why()`): a required 5 to 500
 * character note, then a confirm button. Shared by every Admin screen that
 * asks for a reason (blog reject / take-down now; strikes and deletes next).
 * Mount it only while open: `{open && <AdminReasonDialog … />}`.
 */
export default function AdminReasonDialog({
  title,
  description,
  confirmLabel,
  danger = false,
  label = "Reason",
  hint = "Required, 5 to 500 characters. Kept on record.",
  blockedReason = null,
  onCancel,
  onSubmit,
}: Props) {
  const [reason, setReason] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const length = reason.trim().length;

    if (length < REASON_MIN || length > REASON_MAX) {
      setInvalid(true);
      document.getElementById("admin-reason")?.focus();

      return;
    }

    setBusy(true);
    setError("");

    const message = await onSubmit(reason.trim());

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
            onClick={() => void submit()}
            disabled={busy || Boolean(blockedReason)}
            className={adminBtn(danger ? "dng" : "pri")}
          >
            {busy ? "Saving…" : confirmLabel}
          </button>
        </>
      }
    >
      {description && <p>{description}</p>}

      <AdminErrorNote>{blockedReason}</AdminErrorNote>
      <AdminErrorNote>{error}</AdminErrorNote>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="admin-reason" className="text-[13px] font-semibold text-pd-ink2">
          {label}
        </label>
        <textarea
          id="admin-reason"
          value={reason}
          maxLength={REASON_MAX}
          disabled={busy}
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            setReason(event.target.value);
            if (event.target.value.trim().length >= REASON_MIN) setInvalid(false);
          }}
          className="min-h-24 w-full resize-y rounded-xl border border-pd-line2 bg-white p-3 outline-none focus:border-pd-brand focus:ring-4 focus:ring-pd-b100 aria-[invalid=true]:border-pd-red disabled:bg-pd-bg"
        />
        <span className="text-xs text-pd-ink3">{hint}</span>
        {invalid && (
          <span role="alert" className="text-xs font-semibold text-pd-red">
            Please enter {REASON_MIN} to {REASON_MAX} characters.
          </span>
        )}
      </div>
    </PdDialog>
  );
}
