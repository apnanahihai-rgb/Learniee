"use client";

import { useState } from "react";

import { adminBtn, ADMIN_CONTROL } from "@/features/admin/components/ui/adminStyles";
import { AdminErrorNote, AdminField } from "@/features/admin/components/ui/design";
import PdDialog from "@/features/shared/components/PdDialog";

import {
  COMMUNITY_POLL_MAX_OPTIONS,
  COMMUNITY_POLL_MIN_OPTIONS,
  COMMUNITY_POLL_OPTION_MAX,
  COMMUNITY_POLL_QUESTION_MAX,
  type PollFormValues,
} from "../types/community";

interface Props {
  onCancel: () => void;
  /** Resolve with an error message to keep the dialog open, or null when saved. */
  onSubmit: (values: PollFormValues) => Promise<string | null>;
}

/** Post a poll: question, 2 to 6 options, one-or-many answers, optional end time. Mount only while open. */
export default function PollFormDialog({ onCancel, onSubmit }: Props) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [closesAt, setClosesAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function setOption(index: number, value: string) {
    setOptions((current) => current.map((o, i) => (i === index ? value : o)));
  }

  async function submit() {
    const trimmedQuestion = question.trim();
    const filled = options.map((o) => o.trim()).filter(Boolean);

    if (!trimmedQuestion) return setError("Enter the question.");
    if (filled.length < COMMUNITY_POLL_MIN_OPTIONS) return setError(`Add at least ${COMMUNITY_POLL_MIN_OPTIONS} options.`);
    if (new Set(filled.map((o) => o.toLowerCase())).size !== filled.length) {
      return setError("Options must be different from each other.");
    }
    if (closesAt && new Date(closesAt).getTime() <= Date.now()) return setError("The end time must be in the future.");

    setBusy(true);
    setError("");

    const message = await onSubmit({ question: trimmedQuestion, options: filled, allowMultiple, closesAt });

    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  return (
    <PdDialog
      title="New poll"
      onClose={busy ? () => {} : onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} disabled={busy} className={adminBtn("sec")}>
            Cancel
          </button>
          <button type="button" onClick={() => void submit()} disabled={busy} className={adminBtn("pri")}>
            {busy ? "Posting…" : "Post poll"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <AdminErrorNote>{error}</AdminErrorNote>

        <AdminField id="poll-question" label="Question">
          <input
            id="poll-question"
            className={ADMIN_CONTROL}
            value={question}
            maxLength={COMMUNITY_POLL_QUESTION_MAX}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </AdminField>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-pd-ink2">
            Options ({COMMUNITY_POLL_MIN_OPTIONS} to {COMMUNITY_POLL_MAX_OPTIONS})
          </span>

          {options.map((value, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                aria-label={`Option ${index + 1}`}
                className={ADMIN_CONTROL}
                value={value}
                maxLength={COMMUNITY_POLL_OPTION_MAX}
                placeholder={`Option ${index + 1}`}
                onChange={(e) => setOption(index, e.target.value)}
              />
              {options.length > COMMUNITY_POLL_MIN_OPTIONS && (
                <button
                  type="button"
                  className={adminBtn("dtx", "sm")}
                  onClick={() => setOptions((current) => current.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          {options.length < COMMUNITY_POLL_MAX_OPTIONS && (
            <div>
              <button type="button" className={adminBtn("out", "sm")} onClick={() => setOptions((c) => [...c, ""])}>
                Add option
              </button>
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-pd-ink2">
          <input type="checkbox" checked={allowMultiple} onChange={(e) => setAllowMultiple(e.target.checked)} />
          Parents can pick more than one option
        </label>

        <AdminField
          id="poll-closes"
          label="Closes on"
          optional
          hint="Leave empty to keep it open until you close it."
        >
          <input
            id="poll-closes"
            type="datetime-local"
            className={ADMIN_CONTROL}
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
          />
        </AdminField>
      </div>
    </PdDialog>
  );
}
