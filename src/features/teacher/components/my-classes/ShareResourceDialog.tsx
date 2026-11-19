"use client";

import { useState } from "react";

import PdDialog from "@/features/shared/components/PdDialog";
import PdField from "@/features/parent/components/account/PdField";
import { PD_BTN_PRI, PD_BTN_SEC, PD_INPUT } from "@/features/parent/components/courses/pdUi";
import type { TeacherEnrollment } from "@/features/teacher/hooks/useEnrollments";
import type { ShareResourceInput } from "@/features/teacher/hooks/useResourcesOverview";
import TargetFields, { resolveTargetIds, targetEnrollments } from "./TargetFields";
import { TD_TEXTAREA } from "./TeacherUi";

/** Enrollments a resource can be shared on (matches the server's rule). */
const SHAREABLE = new Set(["ACTIVE", "LAPSED", "COMPLETED"]);

/** Design dialog "Share a resource": a link and/or a file, with one course. */
export default function ShareResourceDialog({
  enrollments,
  onClose,
  onShare,
}: {
  enrollments: TeacherEnrollment[];
  onClose: () => void;
  onShare: (input: ShareResourceInput) => Promise<{ ok: boolean; message?: string }>;
}) {
  const options = targetEnrollments(enrollments, SHAREABLE);
  const [courseId, setCourseId] = useState(options[0]?.course.id ?? "");
  const [studentId, setStudentId] = useState("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const ids = resolveTargetIds(options, courseId, studentId);

    if (ids.length === 0) return setError("Choose a course with students.");
    if (title.trim().length < 3) return setError("Add a title.");
    if (!file && !link.trim()) return setError("Add a file or a link.");
    if (!file && !/^https?:\/\//i.test(link.trim())) return setError("The link must start with http:// or https://");

    setBusy(true);
    setError("");

    const result = await onShare({
      enrollmentIds: ids,
      title: title.trim(),
      description: description.trim(),
      externalUrl: link,
      file,
    });

    setBusy(false);

    if (result.ok) {
      onClose();
    } else {
      setError(result.message ?? "Failed to share resource.");
    }
  }

  return (
    <PdDialog
      title="Share a resource"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={PD_BTN_SEC} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={PD_BTN_PRI} onClick={submit} disabled={busy || options.length === 0}>
            {busy ? "Sharing…" : "Share"}
          </button>
        </>
      }
    >
      {options.length === 0 ? (
        <p className="text-pd-ink2">You need at least one active student to share a resource.</p>
      ) : (
        <>
          <TargetFields
            idPrefix="rs"
            enrollments={options}
            courseId={courseId}
            studentId={studentId}
            onCourse={setCourseId}
            onStudent={setStudentId}
          />
          <PdField id="rs-title" label="Title">
            <input id="rs-title" className={PD_INPUT} maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
          </PdField>
          <PdField id="rs-desc" label="Description (optional)">
            <textarea id="rs-desc" className={TD_TEXTAREA} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
          </PdField>
          <PdField id="rs-link" label="Link (optional)">
            <input id="rs-link" className={PD_INPUT} placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
          </PdField>
          <PdField id="rs-file" label="File (optional)" hint="A file takes priority over a link.">
            <input
              id="rs-file"
              type="file"
              className="text-sm text-pd-ink2 file:mr-3 file:rounded-[10px] file:border-0 file:bg-pd-b50 file:px-3 file:py-2 file:text-[13px] file:font-semibold file:text-pd-brand-d"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </PdField>
          {error && (
            <span role="alert" className="text-xs font-bold text-pd-red">
              {error}
            </span>
          )}
        </>
      )}
    </PdDialog>
  );
}
