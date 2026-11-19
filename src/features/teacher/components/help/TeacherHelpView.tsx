"use client";

import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";

import { PD_BTN_PRI, PD_ERR, PD_INPUT, PdEmpty } from "@/features/parent/components/courses/pdUi";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";
import { Tag } from "@/features/parent/components/home/HomeBits";
import {
  PD_CARD,
  PD_SECTION_H,
  PdBanner,
  PdSkeleton,
  dLong,
} from "@/features/parent/components/payments/paymentsUi";
import { useTeacherComplaints } from "@/features/teacher/hooks/useComplaints";
import {
  COMPLAINT_DEPARTMENTS,
  type ComplaintDepartmentValue,
} from "@/features/shared/utils/complaintDepartment";

/**
 * Teacher "Help & support" (design: help.html). Three department cards, a
 * subject + description, Submit. Backend: `/api/teacher/complaints` via
 * `useTeacherComplaints` (same complaint flow Admin/staff already read).
 * Below the form the teacher still sees their earlier requests and replies.
 */

const SUBJECT_MAX = 150;
const DESCRIPTION_MAX = 2000;

// Teacher-specific wording from the design (labels come from the shared list).
const TEACHER_DEPT_HINTS: Record<ComplaintDepartmentValue, string> = {
  ACCOUNTS: "Payouts, bank account, earnings",
  HR: "Students, parents, conduct",
  IT: "App not working, login, bugs",
};

const LABEL = "text-[13px] font-medium text-pd-ink2";

function statusTag(status: string) {
  if (status === "RESOLVED") return <Tag tone="green">Resolved</Tag>;
  if (status === "CLOSED") return <Tag tone="gray">Closed</Tag>;
  if (status === "IN_PROGRESS") return <Tag tone="violet">Being looked into</Tag>;
  return <Tag tone="amber">Awaiting admin</Tag>;
}

export default function TeacherHelpView() {
  const { complaints, loading, error, submitting, submit } = useTeacherComplaints();
  const { toast, toastNode } = usePdToast();

  const [department, setDepartment] = useState<ComplaintDepartmentValue>(
    COMPLAINT_DEPARTMENTS[0].value,
  );
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const s = subject.trim();
    const d = description.trim();

    if (s.length < 5 || d.length < 10) {
      setFormError("Add a subject and a description.");
      return;
    }
    setFormError("");

    const ok = await submit({ subject: s, description: d, department });
    if (ok) {
      setDepartment(COMPLAINT_DEPARTMENTS[0].value);
      setSubject("");
      setDescription("");
      toast("Sent — we’ll get back to you");
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        noValidate
        className={`${PD_CARD} mt-6 flex max-w-[720px] flex-col gap-5`}
      >
        <div role="radiogroup" aria-label="Report to" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {COMPLAINT_DEPARTMENTS.map((d) => (
            <label
              key={d.value}
              className={`relative flex cursor-pointer flex-col gap-0.5 rounded-xl border p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-pd-brand ${
                department === d.value
                  ? "border-pd-brand bg-pd-b50 shadow-[0_0_0_3px_var(--color-pd-b100)]"
                  : "border-pd-line bg-white hover:border-pd-brand"
              }`}
            >
              <input
                type="radio"
                name="dept"
                value={d.value}
                checked={department === d.value}
                onChange={() => setDepartment(d.value)}
                className="absolute opacity-0"
              />
              <b className="text-[15px] font-medium">{d.label}</b>
              <small className="text-[13px] text-pd-ink3">{TEACHER_DEPT_HINTS[d.value]}</small>
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="help-subject" className={LABEL}>
            Subject
          </label>
          <input
            id="help-subject"
            value={subject}
            maxLength={SUBJECT_MAX}
            onChange={(e) => setSubject(e.target.value)}
            aria-invalid={!!formError && subject.trim().length < 5}
            className={PD_INPUT}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="help-description" className={LABEL}>
            Description
          </label>
          <textarea
            id="help-description"
            value={description}
            maxLength={DESCRIPTION_MAX}
            onChange={(e) => setDescription(e.target.value)}
            aria-invalid={!!formError && description.trim().length < 10}
            className="min-h-[130px] w-full resize-y rounded-xl border border-pd-line2 bg-white p-3 text-sm text-pd-ink outline-none transition focus:border-pd-brand focus:ring-4 focus:ring-pd-b100 aria-invalid:border-pd-red"
          />
          {formError && <span className={PD_ERR}>{formError}</span>}
        </div>

        {error && <PdBanner tone="red">{error}</PdBanner>}

        <button type="submit" disabled={submitting} className={`${PD_BTN_PRI} self-start`}>
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </form>

      {(loading || complaints.length > 0) && (
        <section aria-labelledby="help-history" className="mt-8 max-w-[720px]">
          <h2 id="help-history" className={PD_SECTION_H}>
            Your requests
          </h2>

          <div className="flex flex-col gap-3">
            {loading ? (
              <>
                <PdSkeleton height={96} />
                <PdSkeleton height={96} />
              </>
            ) : complaints.length === 0 ? (
              <div className={PD_CARD}>
                <PdEmpty icon={Check} title="Nothing here" text="No requests yet." />
              </div>
            ) : (
              complaints.map((c) => (
                <article key={c.id} className={`${PD_CARD} flex flex-col gap-1.5`}>
                  <div className="flex justify-between gap-2">
                    <Tag tone="gray">
                      {COMPLAINT_DEPARTMENTS.find((d) => d.value === c.department)?.label ??
                        "General"}
                    </Tag>
                    {statusTag(c.status)}
                  </div>
                  <b className="break-words font-medium">{c.subject}</b>
                  <p className="break-words text-sm text-pd-ink2">{c.description}</p>
                  <span className="text-[13px] text-pd-ink3">Raised {dLong(c.createdAt)}</span>
                  {c.adminNote && (
                    <div className="rounded-lg bg-pd-b50 p-3 text-sm text-pd-ink">
                      <small className="mb-0.5 block text-xs font-bold text-pd-ink3">Reply</small>
                      <span className="break-words">{c.adminNote}</span>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      )}

      {toastNode}
    </>
  );
}
