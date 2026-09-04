"use client";

import { useState } from "react";
import { Paperclip, Trash2 } from "lucide-react";

import { uploadFileToS3 } from "@/lib/uploadFileToS3";
import { useTeacherHomework, type Homework } from "@/features/teacher/hooks/useHomework";

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SubmissionPanel({
  homework,
  onReview,
}: {
  homework: Homework;
  onReview: (feedback?: string) => void;
}) {
  const [feedback, setFeedback] = useState(homework.submission?.feedback ?? "");
  const submission = homework.submission;

  if (!submission) {
    return <p className="text-xs text-gray-400 mt-3">No submission yet.</p>;
  }

  return (
    <div className="mt-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            submission.status === "REVIEWED"
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {submission.status === "REVIEWED" ? "Reviewed" : "Submitted"}
        </span>
        <a
          href={submission.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-bold text-purple-700 hover:underline"
        >
          View submission
        </a>
      </div>

      {submission.note && <p className="text-xs text-gray-600 mt-2">Note: {submission.note}</p>}

      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Feedback (optional)"
          className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5"
        />
        <button
          type="button"
          onClick={() => onReview(feedback)}
          className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-lg"
        >
          {submission.status === "REVIEWED" ? "Update feedback" : "Mark reviewed"}
        </button>
      </div>
    </div>
  );
}

function HomeworkCard({
  homework,
  onDelete,
  onReview,
}: {
  homework: Homework;
  onDelete: () => void;
  onReview: (feedback?: string) => void;
}) {
  const due = formatDate(homework.dueDate);

  return (
    <div className="bg-white border border-purple-100 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-gray-800">{homework.title}</p>
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
              className="inline-flex items-center gap-1 text-xs text-purple-600 hover:underline mt-2"
            >
              <Paperclip size={12} /> Attachment
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="text-gray-300 hover:text-red-500 flex-shrink-0"
          aria-label="Delete homework"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <SubmissionPanel homework={homework} onReview={onReview} />
    </div>
  );
}

function CreateHomeworkForm({
  onCreate,
}: {
  onCreate: (input: {
    title: string;
    instructions?: string;
    attachmentKey?: string;
    dueDate?: string;
  }) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const attachmentKey = file ? await uploadFileToS3({ file, folder: "homework" }) : undefined;

      const ok = await onCreate({
        title,
        instructions: instructions || undefined,
        attachmentKey,
        dueDate: dueDate || undefined,
      });

      if (ok) {
        setTitle("");
        setInstructions("");
        setDueDate("");
        setFile(null);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-purple-100 rounded-xl p-4 space-y-3"
    >
      <p className="font-bold text-gray-800 text-sm">Assign new homework</p>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
        required
      />
      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Instructions (optional)"
        rows={3}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
      />
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2"
        />
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-xs"
        />
      </div>
      <button
        type="submit"
        disabled={saving || !title.trim()}
        className="text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 rounded-lg"
      >
        {saving ? "Assigning…" : "Assign homework"}
      </button>
    </form>
  );
}

export default function TeacherHomeworkPanel({ enrollmentId }: { enrollmentId: string }) {
  const { homeworks, loading, error, create, remove, review } = useTeacherHomework(enrollmentId);

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

      <CreateHomeworkForm onCreate={create} />

      {loading ? (
        <p className="text-gray-500 text-sm">Loading homework…</p>
      ) : homeworks.length === 0 ? (
        <p className="text-gray-400 text-sm">Nothing assigned yet.</p>
      ) : (
        <div className="space-y-3">
          {homeworks.map((hw) => (
            <HomeworkCard
              key={hw.id}
              homework={hw}
              onDelete={() => remove(hw.id)}
              onReview={(feedback) => review(hw.id, feedback)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
