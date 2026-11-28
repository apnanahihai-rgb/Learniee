"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

import {
  PD_BTN_DNG,
  PD_BTN_PRI_SM,
  PD_BTN_SEC_SM,
  PD_INPUT,
} from "@/features/parent/components/courses/pdUi";
import { GROUP_MAX_STUDENTS_LIMIT, GROUP_MIN_STUDENTS } from "@/features/courses/utils/groupClass";
import {
  useGroupContinue,
  type GroupContinuePrompt,
} from "@/features/teacher/hooks/useGroupContinue";
import { formatPlatformTime } from "@/lib/platformTime";

const dayLabel = (key: string) =>
  new Date(key).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function PromptCard({
  prompt,
  onAnswer,
}: {
  prompt: GroupContinuePrompt;
  onAnswer: ReturnType<typeof useGroupContinue>["answer"];
}) {
  const [size, setSize] = useState(String(prompt.maxStudents ?? prompt.seatsTaken ?? GROUP_MIN_STUDENTS));
  const [confirmClose, setConfirmClose] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(action: "CONTINUE" | "CLOSE" | "LATER") {
    if (busy) return;

    setBusy(true);
    setError("");

    const message = await onAnswer(prompt.id, action, action === "CONTINUE" ? Number(size) : undefined);

    if (message) {
      setError(message);
      setBusy(false);
    }
    // On success the question is answered and this card disappears on reload.
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-2">
        <RefreshCw size={16} className="mt-0.5 shrink-0 text-amber-700" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-pd-ink">
            Continue &quot;{prompt.courseTitle}&quot; after {dayLabel(prompt.batchEndDate)}?
          </p>
          <p className="mt-0.5 text-[13px] text-pd-ink3">
            {prompt.overdue
              ? "The 4th-last class is here — it can't be held until you answer."
              : `Answer before the 4th-last class (${formatPlatformTime(new Date(prompt.mustAnswerBy), true)}) — that class can't be held until you do.`}
          </p>
        </div>
      </div>

      {confirmClose ? (
        <div className="mt-3">
          <p className="text-[13px] text-pd-ink">
            Parents will be told the group is closing, no one can renew, and new sign-ups stop. This can&apos;t be undone.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={PD_BTN_DNG} disabled={busy} onClick={() => run("CLOSE")}>
              {busy ? "Closing…" : "Yes, close the group"}
            </button>
            <button type="button" className={PD_BTN_SEC_SM} disabled={busy} onClick={() => setConfirmClose(false)}>
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-[12px] font-semibold text-pd-ink3">
            Max students
            <input
              type="number"
              inputMode="numeric"
              min={Math.max(GROUP_MIN_STUDENTS, prompt.seatsTaken)}
              max={GROUP_MAX_STUDENTS_LIMIT}
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className={`${PD_INPUT} mt-1 block h-[34px] w-24`}
            />
          </label>
          <button type="button" className={PD_BTN_PRI_SM} disabled={busy} onClick={() => run("CONTINUE")}>
            {busy ? "Saving…" : "Yes, continue"}
          </button>
          <button type="button" className={PD_BTN_SEC_SM} disabled={busy} onClick={() => setConfirmClose(true)}>
            No, close
          </button>
          {!prompt.overdue && (
            <button type="button" className={PD_BTN_SEC_SM} disabled={busy} onClick={() => run("LATER")}>
              Remind me later
            </button>
          )}
        </div>
      )}

      {!confirmClose && (
        <p className="mt-2 text-[12px] text-pd-ink3">
          {prompt.seatsTaken} student{prompt.seatsTaken === 1 ? "" : "s"} hold a seat now. Current parents get the
          first chance to renew; new students can only take the seats beyond theirs.
        </p>
      )}

      {error && <p className="mt-2 text-[13px] font-semibold text-pd-red">{error}</p>}
    </div>
  );
}

/**
 * "Continue this group?" for recurring groups: shown on the Teacher's Group
 * classes page (all groups) or one group's page (`courseId`). Renders nothing
 * when no question is due.
 */
export default function GroupContinueBanner({ courseId }: { courseId?: string }) {
  const { prompts, answer } = useGroupContinue(courseId);

  if (prompts.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      {prompts.map((prompt) => (
        <PromptCard key={prompt.id} prompt={prompt} onAnswer={answer} />
      ))}
    </div>
  );
}
