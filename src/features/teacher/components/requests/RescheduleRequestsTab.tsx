"use client";

import { useState } from "react";
import { RotateCw } from "lucide-react";

import { PD_BTN_DTXT_SM, PD_BTN_PRI_SM, PdEmpty } from "@/features/parent/components/courses/pdUi";
import { displayNameFor } from "@/features/shared/types/rescheduleRequest";
import { isPendingOnViewer } from "@/features/shared/utils/rescheduleStatus";
import { avatarColor, useNotice } from "@/features/teacher/components/my-classes/TeacherUi";
import { useTeacherEnrollments } from "@/features/teacher/hooks/useEnrollments";
import { useTeacherRescheduleRequests } from "@/features/teacher/hooks/useRescheduleRequests";
import { whenFromDate } from "@/features/teacher/utils/requestTime";
import { RequestsError, RequestsSkeleton } from "./RequestsUi";

/** Requests > Reschedules: parent-proposed moves waiting for the teacher's answer. */
export default function RescheduleRequestsTab() {
  const { requests, loading, error, actingId, approve, reject, reload } = useTeacherRescheduleRequests();
  // Only used to show the child's name: a request carries the parent, not the learner.
  const { enrollments } = useTeacherEnrollments();
  const [localError, setLocalError] = useState("");
  const notice = useNotice();

  const pending = requests.filter((r) => isPendingOnViewer(r, "TEACHER"));
  const studentName = (id: string, fallback: string) => {
    const s = enrollments.find((e) => e.student.id === id)?.student;

    return s ? s.visibleName || s.firstName : fallback;
  };

  async function respond(id: string, accept: boolean) {
    setLocalError("");
    const row = await (accept ? approve(id) : reject(id));

    if (row) notice.show(accept ? "Approved — class moved" : "Request declined");
    else setLocalError(accept ? "Couldn’t approve this request." : "Couldn’t decline this request.");
  }

  if (loading && requests.length === 0) return <RequestsSkeleton rows={2} height={72} />;
  if (error && requests.length === 0) return <RequestsError message={error} onRetry={reload} />;

  return (
    <div className="mt-5">
      {notice.node}
      {(error || localError) && (
        <p role="alert" className="mb-3 rounded-xl bg-pd-red-bg px-4 py-2.5 text-sm font-semibold text-pd-red">
          {error || localError}
        </p>
      )}

      {pending.length === 0 ? (
        <div className="rounded-2xl border border-pd-line bg-white">
          <PdEmpty icon={RotateCw} title="No reschedule requests" text="You’re all caught up." />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-pd-line bg-white">
          {pending.map((r) => {
            const name = studentName(r.classSession.studentId, displayNameFor(r.parent));
            const color = avatarColor(name);

            return (
              <div
                key={r.id}
                className="relative grid grid-cols-1 items-center gap-x-[18px] gap-y-2 border-t border-pd-line py-3.5 pl-[66px] pr-4 first:border-t-0 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_auto] md:pl-[70px] md:pr-[18px]"
              >
                <span
                  className="absolute left-3.5 top-[26px] grid size-10 place-items-center rounded-xl text-[15px] font-bold text-white md:left-[18px] md:top-1/2 md:-translate-y-1/2"
                  style={{ background: color }}
                >
                  {name[0]}
                </span>

                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[15px] font-semibold leading-[1.3] text-pd-ink">{name}</span>
                  <small className="truncate text-[13px] text-pd-ink3">
                    {r.enrollment.subject || r.enrollment.course.courseTitle || "Class"} · {r.reason || "No reason given"}
                  </small>
                </div>

                <div className="flex min-w-0 flex-col text-[13px]">
                  <span className="text-pd-ink3 line-through decoration-1">
                    {whenFromDate(r.originalScheduledDate, r.originalScheduledTime)}
                  </span>
                  <span className="font-semibold text-pd-brand-d">{whenFromDate(r.proposedDate, r.proposedTime)}</span>
                </div>

                <div className="flex items-center gap-2 md:justify-end">
                  <button
                    type="button"
                    className={PD_BTN_PRI_SM}
                    disabled={actingId === r.id}
                    onClick={() => respond(r.id, true)}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className={PD_BTN_DTXT_SM}
                    disabled={actingId === r.id}
                    onClick={() => respond(r.id, false)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
