"use client";

import { useTeacherRescheduleRequests } from "@/features/teacher/hooks/useRescheduleRequests";
import RescheduleRequestCard from "@/features/shared/components/RescheduleRequestCard";
import { isPendingOnViewer } from "@/features/shared/utils/rescheduleStatus";

/**
 * Sidebar's "Reschedule" entry (previously a dead link,
 * 05-MODULE-SPECS-INDEX.md). Requests awaiting the Teacher's own
 * response (Parent-proposed) show first; everything else (raised by
 * the Teacher themselves, or already resolved) follows as history.
 * Propose a new reschedule from a specific class's own page instead
 * — /teacher/classes/[sessionId]/reschedule.
 */
export default function TeacherReschedulePage() {
  const { requests, loading, error, actingId, approve, reject, cancel } =
    useTeacherRescheduleRequests();

  const needsResponse = requests.filter((r) => isPendingOnViewer(r, "TEACHER"));
  const others = requests.filter((r) => !isPendingOnViewer(r, "TEACHER"));

  return (
    <div className="max-w-2xl mx-auto p-5 sm:p-8">
      <h1 className="font-heading text-xl font-bold text-gray-800 mb-1">Reschedule requests</h1>
      <p className="text-sm text-gray-500 mb-6">
        Move a class to a new date/time — from either side, with the other party's approval.
      </p>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : requests.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-8 text-center text-sm text-gray-500">
          No reschedule requests yet. You can request one from an upcoming class.
        </div>
      ) : (
        <div className="space-y-6">
          {needsResponse.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                Needs your response
              </h2>
              <div className="space-y-3">
                {needsResponse.map((r) => (
                  <RescheduleRequestCard
                    key={r.id}
                    request={r}
                    viewerRole="TEACHER"
                    acting={actingId === r.id}
                    onApprove={(note) => approve(r.id, note)}
                    onReject={(note) => reject(r.id, note)}
                    onCancel={() => cancel(r.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                Other requests
              </h2>
              <div className="space-y-3">
                {others.map((r) => (
                  <RescheduleRequestCard
                    key={r.id}
                    request={r}
                    viewerRole="TEACHER"
                    acting={actingId === r.id}
                    onApprove={(note) => approve(r.id, note)}
                    onReject={(note) => reject(r.id, note)}
                    onCancel={() => cancel(r.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
