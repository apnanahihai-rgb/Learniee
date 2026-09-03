"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageCircle } from "lucide-react";

import type { TeacherEnrollment } from "@/features/teacher/hooks/useEnrollments";
import { getEnrollmentStatusLabel, getEnrollmentStatusStyle } from "@/features/shared/utils/enrollmentStatus";
import { WEEKDAY_LABELS, formatSchedule } from "@/features/shared/utils/weekdays";
import CycleProgressRing from "@/features/shared/components/CycleProgressRing";

interface Props {
  enrollment: TeacherEnrollment;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
  onRevise: (
    id: string,
    input: {
      note: string;
      cycleStartDate?: string;
      sessionsPerMonth?: number;
      scheduleDays?: number[];
      scheduleTime?: string;
    },
  ) => void;
  onMarkSession: (id: string) => void;
}

function displayName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`.trim();
}

export default function EnrollmentApprovalCard({
  enrollment,
  onApprove,
  onReject,
  onRevise,
  onMarkSession,
}: Props) {
  const router = useRouter();
  const [revising, setRevising] = useState(false);
  const [note, setNote] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newSessions, setNewSessions] = useState("");
  const [newScheduleDays, setNewScheduleDays] = useState<number[]>([]);
  const [newScheduleTime, setNewScheduleTime] = useState("");

  const label = getEnrollmentStatusLabel(enrollment.status, "teacher");
  const style = getEnrollmentStatusStyle(enrollment.status);
  const actionable = enrollment.status === "PENDING_TEACHER_APPROVAL";
  const isActive = enrollment.status === "ACTIVE";

  function toggleNewScheduleDay(day: number) {
    setNewScheduleDays((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  }

  function submitRevision() {
    if (!note.trim()) return;

    onRevise(enrollment.id, {
      note,
      cycleStartDate: newDate || undefined,
      sessionsPerMonth: newSessions ? Number(newSessions) : undefined,
      scheduleDays: newScheduleDays.length ? newScheduleDays : undefined,
      scheduleTime: newScheduleTime || undefined,
    });

    setRevising(false);
    setNote("");
    setNewDate("");
    setNewSessions("");
    setNewScheduleDays([]);
    setNewScheduleTime("");
  }

  return (
    <div className="bg-white border rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 truncate">
            {enrollment.course.courseTitle ?? "Untitled course"}
          </p>
          <p className="text-sm text-gray-500 truncate">
            {displayName(enrollment.parent)} — child:{" "}
            {enrollment.student.visibleName || enrollment.student.firstName}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {isActive && (
            <CycleProgressRing
              completed={enrollment.sessionsCompletedInCycle}
              total={enrollment.sessionsPerMonth}
              colorClassName="text-purple-600"
            />
          )}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${style}`}>
            {label}
          </span>
        </div>
      </div>

      {isActive && enrollment.cyclesCompleted > 0 && (
        <p className="text-[11px] text-gray-400 mt-1">
          {enrollment.cyclesCompleted} cycle{enrollment.cyclesCompleted === 1 ? "" : "s"} completed
          {enrollment.cyclePayoutStatus === "READY_FOR_PAYOUT" && " · payout pending"}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mt-3 text-xs text-gray-600">
        <p>Sessions/month: <span className="font-semibold">{enrollment.sessionsPerMonth}</span></p>
        <p>Months: <span className="font-semibold">{enrollment.noOfMonths}</span></p>
        <p>
          Start:{" "}
          <span className="font-semibold">
            {new Date(enrollment.cycleStartDate).toLocaleDateString()}
          </span>
        </p>
        <p>Total paid: <span className="font-semibold">₹{enrollment.amountPaid}</span></p>
        <p className="col-span-2">
          Schedule:{" "}
          <span className="font-semibold">
            {formatSchedule(enrollment.scheduleDays, enrollment.scheduleTime)}
          </span>
        </p>
      </div>

      {enrollment.pricingChangedAfterPayment && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
          ⚠ The revised total (₹{enrollment.totalAmount}) no longer matches what
          was actually charged (₹{enrollment.amountPaid}). No extra charge or
          refund was made automatically — reconcile manually.
        </p>
      )}

      <div className="flex flex-wrap gap-2 mt-3">
        {enrollment.chatRoom && (
          <button
            type="button"
            onClick={() => router.push(`/teacher/chat/${enrollment.chatRoom!.id}`)}
            className="flex items-center gap-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-full transition-colors"
          >
            <MessageCircle size={13} />
            Discuss in chat
          </button>
        )}

        {isActive && (
          <button
            type="button"
            onClick={() => onMarkSession(enrollment.id)}
            className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-2 rounded-full transition-colors"
          >
            Mark session complete
          </button>
        )}
      </div>

      {actionable && !revising && (
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => onApprove(enrollment.id)}
            className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-3 py-2 rounded-full"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => setRevising(true)}
            className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-full"
          >
            Propose a change
          </button>
          <button
            type="button"
            onClick={() => onReject(enrollment.id, window.prompt("Reason (optional):") || undefined)}
            className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-full"
          >
            Reject
          </button>
        </div>
      )}

      {actionable && revising && (
        <div className="mt-4 bg-purple-50 border border-purple-100 rounded-xl p-3 space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Explain the change to the parent (required) — full discussion happens in chat"
            className="w-full text-xs border border-purple-200 rounded-lg px-2 py-1.5 bg-white"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="text-xs border border-purple-200 rounded-lg px-2 py-1.5 bg-white"
            />
            <input
              type="number"
              min={4}
              max={31}
              value={newSessions}
              onChange={(e) => setNewSessions(e.target.value)}
              placeholder="New sessions/month"
              className="text-xs border border-purple-200 rounded-lg px-2 py-1.5 bg-white"
            />
          </div>

          <div className="flex gap-1 flex-wrap">
            {WEEKDAY_LABELS.map((label, day) => {
              const active = newScheduleDays.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleNewScheduleDay(day)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                    active
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white text-gray-500 border-purple-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
            <input
              type="time"
              value={newScheduleTime}
              onChange={(e) => setNewScheduleTime(e.target.value)}
              className="text-xs border border-purple-200 rounded-lg px-2 py-1 bg-white"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={submitRevision}
              disabled={!note.trim()}
              className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 px-3 py-1.5 rounded-full"
            >
              Send to parent
            </button>
            <button
              type="button"
              onClick={() => setRevising(false)}
              className="text-xs font-bold text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
