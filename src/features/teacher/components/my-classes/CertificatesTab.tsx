"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";

import ErrorBanner from "@/features/shared/components/ErrorBanner";
import { Tag } from "@/features/parent/components/home/HomeBits";
import { PD_BTN_DTXT_SM, PD_BTN_PRI_SM, PdEmpty } from "@/features/parent/components/courses/pdUi";
import { useTeacherCertificates } from "@/features/teacher/hooks/useTeacherCertificates";
import type { EligibleEnrollmentView } from "@/features/shared/types/certificate";
import { ConfirmDialog, TD_GRID, useNotice } from "./TeacherUi";

function CertCard({ icon, name, course, children, foot }: {
  icon?: boolean;
  name: string;
  course: string;
  children?: React.ReactNode;
  foot: React.ReactNode;
}) {
  return (
    <article className="flex flex-col gap-3.5 rounded-2xl border border-pd-line bg-white p-5">
      {icon !== false && (
        <span className="grid size-[52px] place-items-center rounded-[14px] bg-pd-b50 text-pd-brand">
          <GraduationCap size={26} />
        </span>
      )}
      <div>
        <b className="block text-base font-semibold text-pd-ink">{name}</b>
        <small className="block text-[13px] text-pd-ink3">{course}</small>
      </div>
      {children}
      {foot}
    </article>
  );
}

/** My classes > Certificates: students ready for a decision, then past decisions. */
export default function CertificatesTab() {
  const { eligible, decided, loading, error, decidingId, decide } = useTeacherCertificates();
  const [pending, setPending] = useState<{ item: EligibleEnrollmentView; action: "issue" | "decline" } | null>(null);
  const notice = useNotice();

  async function confirm() {
    if (!pending) return;

    const { item, action } = pending;
    const ok = await decide(item.enrollmentId, action);

    if (ok) {
      setPending(null);
      notice.show(action === "issue" ? "Certificate issued" : "Certificate declined");
    }
  }

  const isEmpty = !loading && eligible.length === 0 && decided.length === 0;

  return (
    <div className="mt-5">
      {notice.node}
      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <div aria-busy="true" aria-label="Loading" className={TD_GRID}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[190px] animate-pulse rounded-2xl bg-[#eeeaf7]" />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="rounded-2xl border border-pd-line bg-white">
          <PdEmpty icon={GraduationCap} title="No certificates yet" text="Students who finish a course appear here for your decision." />
        </div>
      ) : (
        <div className={`${TD_GRID} mt-3`}>
          {eligible.map((c) => (
            <CertCard
              key={c.enrollmentId}
              name={c.studentName}
              course={c.courseTitle}
              foot={
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button type="button" className={PD_BTN_PRI_SM} onClick={() => setPending({ item: c, action: "issue" })}>
                      Issue certificate
                    </button>
                    <button type="button" className={PD_BTN_DTXT_SM} onClick={() => setPending({ item: c, action: "decline" })}>
                      Decline
                    </button>
                  </div>
                  <small className="text-xs text-pd-ink3">Your decision is final.</small>
                </div>
              }
            >
              <div>
                <div className="h-[5px] overflow-hidden rounded-full bg-pd-b100">
                  <i
                    className="block h-full rounded-[inherit] bg-pd-brand"
                    style={{ width: `${Math.min(100, Math.round((c.sessionsCompleted / Math.max(1, c.sessionsRequired)) * 100))}%` }}
                  />
                </div>
                <small className="mt-1.5 block text-xs text-pd-ink3">
                  {c.sessionsCompleted} of {c.sessionsRequired} sessions counted
                </small>
              </div>
            </CertCard>
          ))}

          {decided.map((c) => (
            <CertCard
              key={c.id}
              name={c.studentName}
              course={c.courseTitle}
              foot={
                <div>
                  {c.status === "ISSUED" ? <Tag tone="green">Issued</Tag> : <Tag tone="gray">Declined</Tag>}
                </div>
              }
            >
              <small className="text-xs text-pd-ink3">
                {c.sessionsCompleted} of {c.sessionsRequired} sessions counted
              </small>
            </CertCard>
          ))}
        </div>
      )}

      {pending && (
        <ConfirmDialog
          title={pending.action === "issue" ? "Issue certificate?" : "Decline certificate?"}
          confirmLabel="Confirm"
          danger={pending.action === "decline"}
          busy={decidingId === pending.item.enrollmentId}
          error={error}
          onConfirm={confirm}
          onClose={() => setPending(null)}
        >
          This is final for {pending.item.studentName} and can’t be changed later.
        </ConfirmDialog>
      )}
    </div>
  );
}
