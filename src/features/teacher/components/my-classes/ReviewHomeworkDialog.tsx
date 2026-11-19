"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import PdDialog from "@/features/shared/components/PdDialog";
import PdField from "@/features/parent/components/account/PdField";
import { PD_BTN_PRI, PD_BTN_SEC, PD_BTN_SEC_SM } from "@/features/parent/components/courses/pdUi";
import type { HomeworkOverviewItem } from "@/features/teacher/hooks/useHomeworkOverview";
import { TD_TEXTAREA } from "./TeacherUi";

/** "Review" on a submitted homework: open the work, add optional feedback, mark reviewed (no grade). */
export default function ReviewHomeworkDialog({
  homework,
  onClose,
  onReview,
}: {
  homework: HomeworkOverviewItem;
  onClose: () => void;
  onReview: (id: string, feedback?: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sub = homework.submission;

  async function submit() {
    setBusy(true);
    setError("");

    const result = await onReview(homework.id, feedback.trim());

    setBusy(false);

    if (result.ok) {
      onClose();
    } else {
      setError(result.message ?? "Failed to mark as reviewed.");
    }
  }

  return (
    <PdDialog
      title="Review homework"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={PD_BTN_SEC} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={PD_BTN_PRI} onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Mark as reviewed"}
          </button>
        </>
      }
    >
      <div>
        <b className="block text-[15px] font-semibold text-pd-ink">{homework.title}</b>
        <small className="text-xs text-pd-ink3">{homework.studentName}</small>
      </div>

      {sub?.note && <p className="rounded-xl bg-pd-bg px-4 py-3 text-pd-ink2">{sub.note}</p>}

      {sub && (
        <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className={`${PD_BTN_SEC_SM} self-start`}>
          <Download size={14} />
          Open submitted work
        </a>
      )}

      <PdField id="hr-feedback" label="Feedback (optional)">
        <textarea id="hr-feedback" className={TD_TEXTAREA} maxLength={1000} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      </PdField>

      {error && (
        <span role="alert" className="text-xs font-bold text-pd-red">
          {error}
        </span>
      )}
    </PdDialog>
  );
}
