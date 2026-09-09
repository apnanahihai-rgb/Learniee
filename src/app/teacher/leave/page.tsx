"use client";

import { useState, type FormEvent } from "react";
import { CalendarOff, X } from "lucide-react";

import { useTeacherLeaveRequests } from "@/features/teacher/hooks/useLeaveRequests";
import { getLeaveRequestStatusStyle } from "@/features/shared/utils/leaveRequestStatus";

/**
 * "Leave" sidebar entry — previously a dead link (see
 * TeacherSidebar.tsx). A Teacher submits a date-range leave request
 * with a reason; it's PENDING until Admin approves or rejects it
 * (`/admin/leave-requests`) — single-step, Admin only, no
 * counter-proposal like RescheduleRequest has. See
 * `leaveRequest.service.ts`.
 */

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Awaiting admin",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Withdrawn",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default function TeacherLeavePage() {
  const { requests, loading, error, submitting, submit, cancel } = useTeacherLeaveRequests();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!startDate || !endDate) {
      setFormError("Pick both a start and end date.");
      return;
    }

    if (!reason.trim()) {
      setFormError("Let admin know why you're requesting leave.");
      return;
    }

    const ok = await submit({ startDate, endDate, reason: reason.trim() });

    if (ok) {
      setStartDate("");
      setEndDate("");
      setReason("");
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-wider text-brand">Schedule</p>
        <h1 className="font-heading text-xl sm:text-2xl font-bold text-gray-800 mt-1 flex items-center gap-2">
          <CalendarOff size={20} className="text-brand" />
          Leave
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Request time off. Admin reviews and approves or rejects every request.
        </p>
      </div>

      {/* New request form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 shadow-sm mb-8 space-y-4"
      >
        <h2 className="font-heading text-base font-bold text-gray-800">Request leave</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-gray-600">
            Start date
            <input
              type="date"
              min={todayISO()}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 outline-none text-sm text-gray-800 focus:border-brand"
              required
            />
          </label>

          <label className="text-xs font-semibold text-gray-600">
            End date
            <input
              type="date"
              min={startDate || todayISO()}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 outline-none text-sm text-gray-800 focus:border-brand"
              required
            />
          </label>
        </div>

        <label className="block text-xs font-semibold text-gray-600">
          Reason
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Let admin know why you need this time off"
            rows={3}
            maxLength={500}
            className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 outline-none text-sm text-gray-800 focus:border-brand resize-none"
            required
          />
        </label>

        {(formError || error) && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {formError || error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bg-brand text-white text-sm font-bold px-5 py-2.5 rounded-full hover:opacity-90 disabled:opacity-50 transition"
        >
          {submitting ? "Submitting..." : "Submit request"}
        </button>
      </form>

      {/* History */}
      <div>
        <h2 className="font-heading text-base font-bold text-gray-800 mb-3">
          Your leave requests
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-violet-50 animate-pulse" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-8 text-center">
            <p className="text-gray-500">You haven&apos;t requested any leave yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div
                key={r.id}
                className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-sm font-bold text-gray-800">
                      {formatDate(r.startDate)} – {formatDate(r.endDate)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{r.reason}</p>
                    {r.adminNote && (
                      <p className="text-xs text-gray-400 mt-1">
                        Admin note: {r.adminNote}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                        getLeaveRequestStatusStyle(r.status)
                      }`}
                    >
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>

                    {r.status === "PENDING" && (
                      <button
                        type="button"
                        onClick={() => cancel(r.id)}
                        className="text-xs font-semibold text-gray-500 hover:text-red-600 flex items-center gap-1"
                      >
                        <X size={12} />
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
