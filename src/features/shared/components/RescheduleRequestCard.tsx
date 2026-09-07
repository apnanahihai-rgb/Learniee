"use client";

import { useState } from "react";
import { CalendarClock, ArrowRight } from "lucide-react";

import type { RescheduleRequestRow } from "@/features/shared/types/rescheduleRequest";
import { displayNameFor } from "@/features/shared/types/rescheduleRequest";
import { formatScheduleTime } from "@/features/shared/utils/weekdays";
import {
  getRescheduleStatusLabel,
  getRescheduleStatusStyle,
  isPendingOnViewer,
  isProposedByViewer,
} from "@/features/shared/utils/rescheduleStatus";

interface Props {
  request: RescheduleRequestRow;
  viewerRole: "TEACHER" | "PARENT";
  acting: boolean;
  onApprove: (note?: string) => void;
  onReject: (note?: string) => void;
  onCancel: () => void;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * One reschedule request — shows the original -> proposed date/time
 * move, who's waiting on whom, and (only when it's actually pending
 * on the viewer, or the viewer is the one who proposed it) the
 * relevant action buttons.
 */
export default function RescheduleRequestCard({
  request,
  viewerRole,
  acting,
  onApprove,
  onReject,
  onCancel,
}: Props) {
  const [note, setNote] = useState("");
  const pendingOnViewer = isPendingOnViewer(request, viewerRole);
  const proposedByViewer = isProposedByViewer(request, viewerRole);
  const canWithdraw =
    proposedByViewer &&
    (request.status === "PENDING_TEACHER_APPROVAL" || request.status === "PENDING_PARENT_APPROVAL");

  const otherParty =
    viewerRole === "TEACHER" ? displayNameFor(request.parent) : displayNameFor(request.teacher);

  return (
    <div className="bg-white border border-violet-100 rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-800 truncate">
            {request.enrollment.course.courseTitle || request.enrollment.subject || "Class"}
          </p>
          <p className="text-xs text-gray-500 truncate">
            with {otherParty} · proposed by {request.requestedBy === "PARENT" ? "Parent" : "Teacher"}
          </p>
        </div>

        <span
          className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${getRescheduleStatusStyle(
            request.status,
          )}`}
        >
          {getRescheduleStatusLabel(request, viewerRole)}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-600 bg-violet-50/60 rounded-xl px-3 py-2">
        <CalendarClock size={14} className="text-brand flex-shrink-0" />
        <span className="line-through text-gray-400">
          {formatDate(request.originalScheduledDate)}
          {request.originalScheduledTime && ` · ${formatScheduleTime(request.originalScheduledTime)}`}
        </span>
        <ArrowRight size={12} className="text-gray-400 flex-shrink-0" />
        <span className="font-bold text-gray-800">
          {formatDate(request.proposedDate)}
          {request.proposedTime && ` · ${formatScheduleTime(request.proposedTime)}`}
        </span>
      </div>

      {request.reason && (
        <p className="text-xs text-gray-500">
          <span className="font-semibold text-gray-600">Reason: </span>
          {request.reason}
        </p>
      )}

      {request.responseNote && (
        <p className="text-xs text-gray-500">
          <span className="font-semibold text-gray-600">Response: </span>
          {request.responseNote}
        </p>
      )}

      {pendingOnViewer && (
        <div className="space-y-2 pt-1">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note back…"
            className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-brand"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={acting}
              onClick={() => onApprove(note || undefined)}
              className="flex-1 text-xs font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 px-3 py-2 rounded-full"
            >
              {acting ? "…" : "Approve"}
            </button>
            <button
              type="button"
              disabled={acting}
              onClick={() => onReject(note || undefined)}
              className="flex-1 text-xs font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 px-3 py-2 rounded-full"
            >
              {acting ? "…" : "Decline"}
            </button>
          </div>
        </div>
      )}

      {canWithdraw && (
        <button
          type="button"
          disabled={acting}
          onClick={onCancel}
          className="text-xs font-bold text-gray-500 hover:text-gray-700 disabled:opacity-40"
        >
          {acting ? "…" : "Withdraw request"}
        </button>
      )}
    </div>
  );
}
