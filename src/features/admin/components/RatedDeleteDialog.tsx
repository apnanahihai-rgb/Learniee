"use client";

import { useState } from "react";

import { DELETE_REASON_MAX, DELETE_REASON_MIN } from "@/features/admin/config/ratingBoard";
import {
  AdminDialog,
  AdminError,
  adminButtonClass,
  adminLabelClass,
  adminTextareaClass,
} from "@/features/admin/components/ui/primitives";

/**
 * Confirm-and-explain dialog for deleting a course or a teacher account.
 * `onSubmit` returns an error message, or null when the delete worked.
 */
export default function RatedDeleteDialog({
  kind,
  name,
  blockedReason,
  onCancel,
  onSubmit,
}: {
  kind: "course" | "teacher";
  name: string;
  /** Set when the server will refuse (live enrollments / open payouts). */
  blockedReason: string | null;
  onCancel: () => void;
  onSubmit: (reason: string) => Promise<string | null>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const length = reason.trim().length;
  const canSubmit = !busy && !blockedReason && length >= DELETE_REASON_MIN && length <= DELETE_REASON_MAX;

  async function submit() {
    setBusy(true);
    setError("");

    const message = await onSubmit(reason.trim());

    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  return (
    <AdminDialog
      title={kind === "course" ? "Delete this course" : "Delete this teacher account"}
      onClose={busy ? () => {} : onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} disabled={busy} className={adminButtonClass("secondary")}>
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={!canSubmit} className={adminButtonClass("danger")}>
            {busy ? "Deleting…" : kind === "course" ? "Delete course" : "Delete account"}
          </button>
        </>
      }
    >
      <p className="-mt-2 mb-3 text-[15px] text-admin-ink">
        <strong>{name}</strong>
      </p>
      <p className="mb-4 text-[15px] text-admin-muted">
        {kind === "course"
          ? "This permanently removes the course with its past enrollments, classes, reviews and certificates. It cannot be undone."
          : "This permanently removes the teacher's login and everything linked to it: courses, reviews, past classes, files and certificates. It cannot be undone."}
      </p>

      {blockedReason && <AdminError>{blockedReason}</AdminError>}
      <AdminError>{error}</AdminError>

      <label htmlFor="delete-reason" className={`${adminLabelClass} ${blockedReason || error ? "mt-3" : ""}`}>
        Reason <span className="font-semibold text-admin-muted">(required, saved in the Activity Log)</span>
      </label>
      <textarea
        id="delete-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        maxLength={DELETE_REASON_MAX}
        className={adminTextareaClass}
      />
      <span className="mt-1 block text-sm text-admin-muted">
        At least {DELETE_REASON_MIN} characters. Up to {DELETE_REASON_MAX}.
      </span>
    </AdminDialog>
  );
}
