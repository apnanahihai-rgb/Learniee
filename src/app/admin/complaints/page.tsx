"use client";

import { useState } from "react";

import { useAdminComplaints } from "@/features/admin/hooks/useComplaints";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import { getComplaintStatusStyle } from "@/features/shared/utils/complaintStatus";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminComplaintsPage() {
  const { complaints, loading, error, markInProgress, resolve, close } = useAdminComplaints();
  const [showResolved, setShowResolved] = useState(false);

  const visible = showResolved
    ? complaints
    : complaints.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS");
  const openCount = complaints.filter((c) => c.status === "OPEN").length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-purple-600">Complaints</h1>
            <p className="text-gray-500 mt-1">
              {openCount} open complaint{openCount === 1 ? "" : "s"} waiting on you.
            </p>
          </div>

          <button
            onClick={() => setShowResolved((v) => !v)}
            className="text-sm font-semibold text-purple-600 border border-purple-200 rounded-lg px-4 py-2 hover:bg-purple-50"
          >
            {showResolved ? "Show open only" : "Show all history"}
          </button>
        </div>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        {loading ? (
          <p className="text-gray-500">Loading complaints...</p>
        ) : visible.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center">
            <p className="text-gray-500">
              {showResolved ? "No complaints yet." : "Nothing waiting on your response."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((c) => (
              <div
                key={c.id}
                className="bg-white border rounded-xl p-6 shadow-sm flex items-start justify-between gap-4 flex-wrap"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    {c.raiserRole}
                  </p>
                  <p className="text-lg font-semibold text-gray-800">
                    {c.raiserName || "Unknown"}
                  </p>
                  {c.raiserEmail && <p className="text-sm text-gray-500">{c.raiserEmail}</p>}
                  <p className="text-sm font-semibold text-gray-700 mt-2">{c.subject}</p>
                  <p className="text-sm text-gray-500 mt-1">{c.description}</p>
                  <p className="text-xs text-gray-400 mt-1">Raised {formatDate(c.createdAt)}</p>
                  {c.adminNote && (
                    <p className="text-xs text-gray-400 mt-1">Your note: {c.adminNote}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-3">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${getComplaintStatusStyle(
                      c.status,
                    )}`}
                  >
                    {c.status}
                  </span>

                  {(c.status === "OPEN" || c.status === "IN_PROGRESS") && (
                    <div className="flex flex-wrap gap-2 justify-end">
                      {c.status === "OPEN" && (
                        <button
                          onClick={() => markInProgress(c.id)}
                          className="text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg"
                        >
                          Mark in progress
                        </button>
                      )}
                      <button
                        onClick={() =>
                          resolve(c.id, window.prompt("Note for the raiser (optional):") || undefined)
                        }
                        className="text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() =>
                          close(c.id, window.prompt("Note for the raiser (optional):") || undefined)
                        }
                        className="text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
