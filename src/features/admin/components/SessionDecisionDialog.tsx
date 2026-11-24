"use client";

import { useState } from "react";

import {
  ADMIN_DECISION_OPTIONS,
  DECISION_REASON_MAX_LENGTH,
  DECISION_REASON_MIN_LENGTH,
} from "@/features/shared/utils/outcomeConfirmation";
import { SESSION_STATUS_LABEL } from "@/features/shared/utils/sessionOutcome";
import type { SessionReviewItem } from "@/features/shared/types/sessionReview";
import { adminBtn, cx } from "@/features/admin/components/ui/adminStyles";
import { AdminErrorNote } from "@/features/admin/components/ui/design";
import PdDialog from "@/features/shared/components/PdDialog";

/** Decide (or override) a class outcome. Opens from a Class review card (Admin design 07). */
export default function SessionDecisionDialog({
  item,
  onCancel,
  onSubmit,
}: {
  item: SessionReviewItem;
  onCancel: () => void;
  /** Resolve with an error message to keep the dialog open, or null when saved. */
  onSubmit: (status: string, reason: string) => Promise<string | null>;
}) {
  const [status, setStatus] = useState<string>(item.reason === "REPORTED" ? item.status : "");
  const [reason, setReason] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isOverride = item.kind === "OVERRIDE";
  const stands = status === item.status;
  const length = reason.trim().length;
  const canSubmit = !busy && status !== "" && !(isOverride && stands);

  async function submit() {
    if (length < DECISION_REASON_MIN_LENGTH || length > DECISION_REASON_MAX_LENGTH) {
      setInvalid(true);
      document.getElementById("decision-reason")?.focus();

      return;
    }

    setBusy(true);
    setError("");

    const failure = await onSubmit(status, reason.trim());

    if (failure) {
      setError(failure);
      setBusy(false);
    }
  }

  return (
    <PdDialog
      title={isOverride ? "Override this class" : "Decide this class"}
      onClose={busy ? () => {} : onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} disabled={busy} className={adminBtn("sec")}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit}
            className={adminBtn("pri")}
          >
            {busy ? "Saving…" : "Save decision"}
          </button>
        </>
      }
    >
      <p className="text-pd-ink2">
        Recorded as <b>{SESSION_STATUS_LABEL[item.status]}</b>.
        {item.reason === "REPORTED" && " Pick the same outcome to keep it as recorded."}
        {isOverride && " For an override, pick a different outcome than the one recorded."}
      </p>

      <AdminErrorNote>{error}</AdminErrorNote>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[13px] font-semibold text-pd-ink2">Outcome</legend>
        <div className="flex flex-col gap-2">
          {ADMIN_DECISION_OPTIONS.map((option) => (
            <label
              key={option.status}
              className={cx(
                "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 font-semibold",
                status === option.status ? "border-pd-brand bg-pd-b50" : "border-pd-line",
              )}
            >
              <input
                type="radio"
                name="outcome"
                value={option.status}
                checked={status === option.status}
                disabled={busy}
                onChange={() => setStatus(option.status)}
                className="size-[18px] accent-pd-brand"
              />
              <span className="flex flex-col">
                <span>
                  {option.label}
                  {option.status === item.status && (
                    <span className="ml-2 text-xs font-normal text-pd-ink3">(as recorded)</span>
                  )}
                </span>
                <span className="text-xs font-normal text-pd-ink3">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {isOverride && stands && (
        <p role="note" className="text-xs font-semibold text-pd-amber">
          That is already the recorded outcome. Pick a different one to override it.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="decision-reason" className="text-[13px] font-semibold text-pd-ink2">
          Reason
        </label>
        <textarea
          id="decision-reason"
          value={reason}
          maxLength={DECISION_REASON_MAX_LENGTH}
          disabled={busy}
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            setReason(event.target.value);
            if (event.target.value.trim().length >= DECISION_REASON_MIN_LENGTH) setInvalid(false);
          }}
          className="min-h-24 w-full resize-y rounded-xl border border-pd-line2 bg-white p-3 outline-none focus:border-pd-brand focus:ring-4 focus:ring-pd-b100 aria-[invalid=true]:border-pd-red disabled:bg-pd-bg"
        />
        <span className="text-xs text-pd-ink3">
          Required, at least {DECISION_REASON_MIN_LENGTH} characters. Logged and shown in the class
          history.
        </span>
        {invalid && (
          <span role="alert" className="text-xs font-semibold text-pd-red">
            Please enter {DECISION_REASON_MIN_LENGTH} to {DECISION_REASON_MAX_LENGTH} characters.
          </span>
        )}
      </div>
    </PdDialog>
  );
}
