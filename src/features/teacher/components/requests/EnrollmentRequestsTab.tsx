"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import {
  PD_BTN_DTXT_SM,
  PD_BTN_PRI_SM,
  PD_BTN_SEC_SM,
  PdEmpty,
  rupees,
} from "@/features/parent/components/courses/pdUi";
import { Tag } from "@/features/parent/components/home/HomeBits";
import { buildCyclePlan, formatCycleRange, isStartDateInPast } from "@/features/shared/utils/cyclePlan";
import { formatSchedule } from "@/features/shared/utils/weekdays";
import { ConfirmDialog, useNotice } from "@/features/teacher/components/my-classes/TeacherUi";
import { useTeacherEnrollments, type TeacherEnrollment } from "@/features/teacher/hooks/useEnrollments";
import { toDateKey, todayInPlatformTz } from "@/lib/platformTime";
import ProposeChangeDialog from "./ProposeChangeDialog";
import { RequestsError, RequestsSkeleton } from "./RequestsUi";

/** Statuses where the enrollment is still waiting on someone (Teacher, Parent or Admin). */
const OPEN_STATUSES = new Set([
  "PENDING_TEACHER_APPROVAL",
  "PENDING_PARENT_RECONFIRMATION",
  "PENDING_ADMIN_APPROVAL",
]);

const fullName = (p: { firstName: string; lastName: string; visibleName?: string | null }) =>
  p.visibleName?.trim() || `${p.firstName} ${p.lastName}`.trim();

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-pd-bg px-4 py-3">
      <small className="block text-xs font-bold text-pd-ink3">{label}</small>
      <b className="text-sm font-semibold text-pd-ink">{value}</b>
    </div>
  );
}

function statusTag(status: string) {
  if (status === "PENDING_TEACHER_APPROVAL") return <Tag tone="amber">Awaiting your review</Tag>;
  if (status === "PENDING_PARENT_RECONFIRMATION") return <Tag tone="violet">Waiting for the parent</Tag>;

  return <Tag tone="violet">Sent to admin</Tag>;
}

function EnrollmentCard({
  e,
  onApprove,
  onPropose,
  onReject,
}: {
  e: TeacherEnrollment;
  onApprove: () => void;
  onPropose: () => void;
  onReject: () => void;
}) {
  const customKeys = (e.cycles?.[0]?.customDates ?? []).map((d) => d.slice(0, 10));
  const plan = !e.isLegacy
    ? buildCyclePlan(e.cycleStartDate.slice(0, 10), e.scheduleDays ?? [], e.planType ?? "MONTHLY", customKeys)
    : null;
  const startPassed = plan ? isStartDateInPast(plan.startDate, todayInPlatformTz()) : false;

  const review = e.status === "PENDING_TEACHER_APPROVAL";
  // A start date that has passed blocks the Admin step too, so the teacher may revise it.
  const canPropose = review || (startPassed && e.status === "PENDING_ADMIN_APPROVAL");

  const cycle = plan
    ? `${e.sessionsPerMonth} session${e.sessionsPerMonth === 1 ? "" : "s"} · ${formatCycleRange(plan)}`
    : `${e.sessionsPerMonth} sessions/month · ${e.noOfMonths} month${e.noOfMonths === 1 ? "" : "s"}`;
  const schedule =
    customKeys.length > 0
      ? `${customKeys.length} picked dates · ${formatSchedule(e.scheduleDays, e.scheduleTime)}`
      : formatSchedule(e.scheduleDays, e.scheduleTime);

  return (
    <article id={`enrollment-${e.id}`} className="flex scroll-mt-24 flex-col gap-3.5 rounded-[20px] border border-pd-line bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <b className="block font-heading text-base font-semibold text-pd-ink">
            {e.course.courseTitle ?? "Untitled course"}
          </b>
          <small className="text-[13px] text-pd-ink3">
            {fullName(e.parent)} · child: {e.student.visibleName || e.student.firstName}
          </small>
        </div>
        {statusTag(e.status)}
      </div>

      <dl className="grid grid-cols-2 gap-3 [&_dd]:m-0 [&_dt]:m-0">
        <Kv label="Cycle" value={cycle} />
        <Kv label="Total paid" value={rupees(Number(e.amountPaid))} />
        <Kv label="Schedule" value={schedule} />
      </dl>

      {startPassed && (review || e.status === "PENDING_ADMIN_APPROVAL") && (
        <p className="rounded-xl bg-pd-amber-bg px-4 py-2.5 text-[13px] font-semibold text-pd-amber">
          The start date has already passed, so this can’t be approved as is. Use “Propose a change” to set a new
          start date.
        </p>
      )}

      {e.pricingChangedAfterPayment && (
        <p className="rounded-xl bg-pd-amber-bg px-4 py-2.5 text-[13px] font-semibold text-pd-amber">
          The revised total (₹{e.totalAmount}) no longer matches what was charged (₹{e.amountPaid}). No extra charge
          or refund was made automatically.
        </p>
      )}

      {review || canPropose ? (
        <div className="flex flex-wrap gap-2">
          {review && (
            <button
              type="button"
              className={PD_BTN_PRI_SM}
              disabled={startPassed}
              title={startPassed ? "Start date has passed — propose a new one" : undefined}
              onClick={onApprove}
            >
              Approve
            </button>
          )}
          {canPropose && (
            <button type="button" className={PD_BTN_SEC_SM} onClick={onPropose}>
              Propose a change
            </button>
          )}
          {review && (
            <button type="button" className={PD_BTN_DTXT_SM} onClick={onReject}>
              Reject
            </button>
          )}
        </div>
      ) : (
        <small className="text-[13px] text-pd-ink3">
          {e.status === "PENDING_PARENT_RECONFIRMATION"
            ? "Waiting for the parent to confirm your proposed change."
            : "Admin is doing the final check. Classes are created once approved."}
        </small>
      )}
    </article>
  );
}

/** Requests > Enrollments: everything waiting on the teacher, the parent or Admin. */
export default function EnrollmentRequestsTab() {
  const { enrollments, loading, error, reload, approve, reject, revise } = useTeacherEnrollments();
  const [dialog, setDialog] = useState<{ kind: "reject" | "propose"; e: TeacherEnrollment } | null>(null);
  const [busy, setBusy] = useState(false);
  const notice = useNotice();

  const list = enrollments.filter((e) => OPEN_STATUSES.has(e.status));

  async function run(task: Promise<boolean>, message: string) {
    setBusy(true);
    const ok = await task;
    setBusy(false);

    if (ok) {
      setDialog(null);
      notice.show(message);
    }
  }

  if (loading && enrollments.length === 0) return <RequestsSkeleton />;
  if (error && enrollments.length === 0) return <RequestsError message="We couldn’t load your requests. Check your connection and try again." onRetry={reload} />;

  const target = dialog?.e;
  return (
    <div className="mt-5">
      {notice.node}
      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-pd-red-bg px-4 py-2.5 text-sm font-semibold text-pd-red">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-pd-line bg-white">
            <PdEmpty icon={CheckCircle2} title="All caught up" text="No enrollments need you." />
          </div>
        ) : (
          list.map((e) => (
            <EnrollmentCard
              key={e.id}
              e={e}
              onApprove={() => run(approve(e.id), "Approved — sent to Admin")}
              onPropose={() => setDialog({ kind: "propose", e })}
              onReject={() => setDialog({ kind: "reject", e })}
            />
          ))
        )}
      </div>

      {dialog?.kind === "reject" && target && (
        <ConfirmDialog
          title="Reject this enrollment?"
          confirmLabel="Reject"
          danger
          busy={busy}
          onConfirm={() => run(reject(target.id), "Enrollment rejected")}
          onClose={() => setDialog(null)}
        >
          <p>
            {fullName(target.parent)} will be notified and the payment is handled by Admin. This can’t be undone.
          </p>
        </ConfirmDialog>
      )}

      {dialog?.kind === "propose" && target && (
        <ProposeChangeDialog
          isLegacy={target.isLegacy}
          isCustomPlan={!target.isLegacy && (target.cycles?.[0]?.customDates?.length ?? 0) > 0}
          currentStartDate={target.cycleStartDate.slice(0, 10)}
          currentCustomDates={(target.cycles?.[0]?.customDates ?? []).map((d) => d.slice(0, 10))}
          minStartDate={toDateKey(todayInPlatformTz())}
          busy={busy}
          onSubmit={(input) => run(revise(target.id, input), "Proposal sent to the parent")}
          onClose={() => setDialog(null)}
        />
      )}

    </div>
  );
}
