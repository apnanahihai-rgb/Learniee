"use client";

import { useState } from "react";
import { Paperclip } from "lucide-react";

import { useParentHomework, type Homework } from "@/features/parent/hooks/useHomework";

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SubmitForm({
  homework,
  submitting,
  onSubmit,
}: {
  homework: Homework;
  submitting: boolean;
  onSubmit: (file: File, note?: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const submission = homework.submission;

  return (
    <div className="mt-3 bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-2">
      {submission && (
        <p className="text-xs text-gray-500">
          Last submitted {new Date(submission.submittedAt).toLocaleDateString()} —{" "}
          <a href={submission.fileUrl} target="_blank" rel="noreferrer" className="text-violet-600 hover:underline">
            view file
          </a>
        </p>
      )}

      {submission?.status === "REVIEWED" && submission.feedback && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-2 py-1.5">
          Teacher feedback: {submission.feedback}
        </p>
      )}

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-xs"
      />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5"
      />
      <button
        type="button"
        disabled={!file || submitting}
        onClick={() => file && onSubmit(file, note || undefined)}
        className="text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-3 py-1.5 rounded-lg"
      >
        {submitting ? "Uploading…" : submission ? "Resubmit" : "Submit"}
      </button>
    </div>
  );
}

function HomeworkCard({
  homework,
  submitting,
  onSubmit,
}: {
  homework: Homework;
  submitting: boolean;
  onSubmit: (file: File, note?: string) => void;
}) {
  const due = formatDate(homework.dueDate);

  return (
    <div className="bg-white border border-violet-100 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading font-bold text-gray-800">{homework.title}</p>
          {homework.instructions && (
            <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">
              {homework.instructions}
            </p>
          )}
          {due && <p className="text-xs text-gray-400 mt-1">Due {due}</p>}
          {homework.attachmentUrl && (
            <a
              href={homework.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline mt-2"
            >
              <Paperclip size={12} /> Attachment from teacher
            </a>
          )}
        </div>

        {homework.submission && (
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
              homework.submission.status === "REVIEWED"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {homework.submission.status === "REVIEWED" ? "Reviewed" : "Submitted"}
          </span>
        )}
      </div>

      <SubmitForm
        homework={homework}
        submitting={submitting}
        onSubmit={onSubmit}
      />
    </div>
  );
}

export default function ParentHomeworkPanel({ enrollmentId }: { enrollmentId: string }) {
  const { homeworks, loading, error, submit, submittingId } = useParentHomework(enrollmentId);

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading homework…</p>
      ) : homeworks.length === 0 ? (
        <div className="bg-white border rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">No homework assigned yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {homeworks.map((hw) => (
            <HomeworkCard
              key={hw.id}
              homework={hw}
              submitting={submittingId === hw.id}
              onSubmit={(file, note) => submit(hw.id, file, note)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
