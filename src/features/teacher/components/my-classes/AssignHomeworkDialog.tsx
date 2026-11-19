"use client";

import { useState } from "react";

import PdDialog from "@/features/shared/components/PdDialog";
import PdField from "@/features/parent/components/account/PdField";
import { PD_BTN_PRI, PD_BTN_SEC, PD_INPUT } from "@/features/parent/components/courses/pdUi";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/features/shared/utils/enrollmentStatus";
import type { TeacherEnrollment } from "@/features/teacher/hooks/useEnrollments";
import type { AssignHomeworkInput } from "@/features/teacher/hooks/useHomeworkOverview";
import TargetFields, { resolveTargetIds, targetEnrollments } from "./TargetFields";
import { TD_TEXTAREA } from "./TeacherUi";

/** Design dialog "Assign homework" (+ optional instructions and attachment). */
export default function AssignHomeworkDialog({
  enrollments,
  onClose,
  onAssign,
}: {
  enrollments: TeacherEnrollment[];
  onClose: () => void;
  onAssign: (input: AssignHomeworkInput) => Promise<{ ok: boolean; message?: string }>;
}) {
  const options = targetEnrollments(enrollments, ACTIVE_ENROLLMENT_STATUSES);
  const [courseId, setCourseId] = useState(options[0]?.course.id ?? "");
  const [studentId, setStudentId] = useState("all");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const ids = resolveTargetIds(options, courseId, studentId);

    if (ids.length === 0) return setError("Choose a course with active students.");
    if (title.trim().length < 3) return setError("Add a title.");

    setBusy(true);
    setError("");

    const result = await onAssign({
      enrollmentIds: ids,
      title: title.trim(),
      instructions: instructions.trim(),
      dueDate,
      file,
    });

    setBusy(false);

    if (result.ok) {
      onClose();
    } else {
      setError(result.message ?? "Failed to assign homework.");
    }
  }

  return (
    <PdDialog
      title="Assign homework"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={PD_BTN_SEC} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={PD_BTN_PRI} onClick={submit} disabled={busy || options.length === 0}>
            {busy ? "Assigning…" : "Assign"}
          </button>
        </>
      }
    >
      {options.length === 0 ? (
        <p className="text-pd-ink2">You need at least one active student to assign homework.</p>
      ) : (
        <>
          <TargetFields
            idPrefix="hw"
            enrollments={options}
            courseId={courseId}
            studentId={studentId}
            onCourse={setCourseId}
            onStudent={setStudentId}
          />
          <PdField id="hw-title" label="Title">
            <input id="hw-title" className={PD_INPUT} maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
          </PdField>
          <PdField id="hw-due" label="Due date">
            <input id="hw-due" type="date" className={PD_INPUT} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </PdField>
          <PdField id="hw-ins" label="Instructions (optional)">
            <textarea id="hw-ins" className={TD_TEXTAREA} maxLength={2000} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </PdField>
          <PdField id="hw-file" label="Attachment (optional)">
            <input
              id="hw-file"
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
