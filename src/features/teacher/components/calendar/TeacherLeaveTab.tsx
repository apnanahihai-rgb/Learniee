"use client";

import { useState, type FormEvent } from "react";
import { CalendarOff } from "lucide-react";

import {
  PD_BTN_PRI,
  PD_INPUT,
  PdEmpty,
} from "@/features/parent/components/courses/pdUi";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";
import { Tag } from "@/features/parent/components/home/HomeBits";
import { Field, RequestsSkeleton } from "@/features/teacher/components/requests/RequestsUi";
import {
  useTeacherLeaveRequests,
  type TeacherLeaveRequest,
} from "@/features/teacher/hooks/useLeaveRequests";
import { toDateKey, todayInPlatformTz } from "@/lib/platformTime";

const TEXTAREA =
  "min-h-24 w-full resize-y rounded-xl border border-pd-line2 bg-white p-3 text-sm text-pd-ink outline-none transition focus:border-pd-brand focus:ring-4 focus:ring-pd-b100 aria-invalid:border-pd-red";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function statusTag(r: TeacherLeaveRequest, today: string) {
  if (r.status === "APPROVED") {
    return r.endDate.slice(0, 10) < today ? (
      <Tag tone="gray">Past</Tag>
    ) : (
      <Tag tone="green">Approved</Tag>
    );
  }
  if (r.status === "REJECTED") return <Tag tone="red">Rejected</Tag>;
  if (r.status === "CANCELLED") return <Tag tone="gray">Withdrawn</Tag>;

  return <Tag tone="gray">Pending</Tag>;
}

/** Teacher Calendar → Leave: request time off (Admin approves) and see past requests. */
export default function TeacherLeaveTab() {
  const { requests, loading, error, submitting, submit, cancel } = useTeacherLeaveRequests();
  const { toast, toastNode } = usePdToast();

  const today = toDateKey(todayInPlatformTz());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!startDate || !endDate || endDate < startDate || reason.trim().length < 3) {
      setFormError("Pick valid dates and add a reason.");
      return;
    }

    const ok = await submit({ startDate, endDate, reason: reason.trim() });

    if (ok) {
      setStartDate("");
      setEndDate("");
      setReason("");
      toast("Leave request sent to Admin");
    }
  }

  async function handleWithdraw(id: string) {
    if (await cancel(id)) toast("Leave request withdrawn");
  }

  return (
    <div className="mt-5 flex flex-col gap-6 min-[1180px]:grid min-[1180px]:grid-cols-[minmax(0,1fr)_340px] min-[1180px]:items-start">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex min-w-0 flex-col gap-5 rounded-2xl border border-pd-line bg-white p-4"
      >
        <h2 className="text-[17px] font-semibold text-pd-ink">Request leave</h2>
        <p className="text-[13px] text-pd-ink3">
          Classes inside your leave are moved to the next free slot. Leave with under 24 hours’ notice is
          flagged to Admin.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="leave-from" label="From">
            <input
              id="leave-from"
              type="date"
              min={today}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={PD_INPUT}
            />
          </Field>
          <Field id="leave-to" label="To">
            <input
              id="leave-to"
              type="date"
              min={startDate || today}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={PD_INPUT}
            />
          </Field>
        </div>

        <Field id="leave-reason" label="Reason" error={formError || error}>
          <textarea
            id="leave-reason"
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={Boolean(formError)}
            className={TEXTAREA}
          />
        </Field>

        <button type="submit" disabled={submitting} className={`${PD_BTN_PRI} self-start`}>
          {submitting ? "Sending…" : "Send to admin"}
        </button>
      </form>

      <section aria-labelledby="leave-list" className="min-w-0">
        <h2 id="leave-list" className="mb-3 font-heading text-[19px] font-semibold text-pd-ink">
          Your leave
        </h2>

        {loading && requests.length === 0 ? (
          <RequestsSkeleton rows={2} height={72} />
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-pd-line bg-white">
            <PdEmpty
              icon={CalendarOff}
              title="No leave yet"
              text="Requests you send to Admin will show up here."
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-pd-line bg-white">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 border-t border-pd-line px-4 py-3.5 first:border-t-0"
              >
                <div className="min-w-0 flex-1">
                  <b className="block text-sm font-medium text-pd-ink">
                    {formatDate(r.startDate)}
                    {r.endDate.slice(0, 10) !== r.startDate.slice(0, 10) ? ` – ${formatDate(r.endDate)}` : ""}
                  </b>
                  <small className="block text-[13px] text-pd-ink3">{r.reason}</small>
                  {r.adminNote && (
                    <small className="block text-xs text-pd-ink3">Admin note: {r.adminNote}</small>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {statusTag(r, today)}
                  {r.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => handleWithdraw(r.id)}
                      className="rounded-[10px] px-2 py-0.5 text-[13px] font-semibold text-pd-red transition-colors hover:bg-pd-red-bg"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {toastNode}
    </div>
  );
}
