"use client";

import { useTeacherRescheduleRequests } from "@/features/teacher/hooks/useRescheduleRequests";
import { useTeacherCalendar } from "@/features/teacher/hooks/useCalendar";
import RescheduleRequestCard from "@/features/shared/components/RescheduleRequestCard";
import UpcomingClassPicker from "@/features/shared/components/reschedule/UpcomingClassPicker";
import { isPendingOnViewer } from "@/features/shared/utils/rescheduleStatus";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Sidebar's "Reschedule" entry — the single place for everything
 * reschedule-related, both raising a new request (via
 * UpcomingClassPicker, reading the same `/api/teacher/calendar`
 * occurrences the Calendar page uses) and managing existing ones.
 * Requests awaiting the Teacher's own response (Parent-proposed)
 * show first; everything else (raised by the Teacher themselves, or
 * already resolved) follows as history.
 */
export default function TeacherReschedulePage() {
  const { requests, loading, error, actingId, approve, reject, cancel } =
    useTeacherRescheduleRequests();
  const { occurrences, loading: occurrencesLoading } = useTeacherCalendar(
    currentMonthKey(),
  );

  const needsResponse = requests.filter((r) => isPendingOnViewer(r, "TEACHER"));
  const others = requests.filter((r) => !isPendingOnViewer(r, "TEACHER"));

  return (
    <div className="max-w-2xl mx-auto p-5 sm:p-8">
      <h1 className="font-heading text-xl font-bold text-gray-800 mb-1">Reschedule</h1>
      <p className="text-sm text-gray-500 mb-6">
        Move a class to a new date/time — from either side, with the other party's approval.
      </p>

      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
          Request a reschedule
        </h2>
        <UpcomingClassPicker
          occurrences={occurrences}
          loading={occurrencesLoading}
          role="teacher"
        />
      </section>

      {error && <ErrorBanner size="compact">{error}</ErrorBanner>}

      {!loading && requests.length > 0 && (
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

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
    </div>
  );
}
