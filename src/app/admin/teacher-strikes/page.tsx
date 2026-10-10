"use client";

import { useState } from "react";

import { useTeacherStrikes, type AdminTeacherStrike } from "@/features/admin/hooks/useTeacherStrikes";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import { formatPlatformTime } from "@/lib/platformTime";

const REASON_LABEL: Record<AdminTeacherStrike["reason"], string> = {
  TEACHER_NO_SHOW: "Did not join",
  TEACHER_CANCELLED: "Cancelled the class",
};

const WAIVE_REASON_MIN = 5;
const WAIVE_REASON_MAX = 500;

function at(iso: string | null) {
  return iso ? formatPlatformTime(new Date(iso), true) : "—";
}

function WaiveModal({
  strike,
  onCancel,
  onSubmit,
}: {
  strike: AdminTeacherStrike;
  onCancel: () => void;
  onSubmit: (reason: string) => Promise<string | null>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const length = reason.trim().length;
  const canSubmit = !busy && length >= WAIVE_REASON_MIN && length <= WAIVE_REASON_MAX;

  async function submit() {
    setBusy(true);
    setError("");

    const message = await onSubmit(reason.trim());

    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-800">Waive this strike</h2>
        <p className="text-sm text-gray-500 mt-1">
          {strike.teacherName} · {REASON_LABEL[strike.reason]} · {at(strike.classStartsAt)}. The
          strike stays on the record but no longer counts.
        </p>

        {error && <ErrorBanner size="compact">{error}</ErrorBanner>}

        <label className="block text-xs font-bold text-gray-600 mt-4 mb-1">
          Reason (required, e.g. emergency leave)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={WAIVE_REASON_MAX}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400 resize-none"
        />

        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="text-sm font-semibold text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 px-4 py-2 rounded-lg"
          >
            {busy ? "Saving…" : "Waive strike"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTeacherStrikesPage() {
  const { strikes, loading, error, waive } = useTeacherStrikes();
  const [showWaived, setShowWaived] = useState(false);
  const [waiving, setWaiving] = useState<AdminTeacherStrike | null>(null);

  const active = strikes.filter((s) => !s.waivedAt);
  const visible = showWaived ? strikes : active;

  // Active strikes per teacher, for the badge next to each name.
  const activeCount = new Map<string, number>();
  for (const s of active) activeCount.set(s.teacherId, (activeCount.get(s.teacherId) ?? 0) + 1);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-purple-600">Teacher Strikes</h1>
            <p className="text-gray-500 mt-1">
              {active.length} active strike{active.length === 1 ? "" : "s"}. Waive one for a good
              reason (for example an emergency) and it stops counting.
            </p>
          </div>

          <button
            onClick={() => setShowWaived((v) => !v)}
            className="text-sm font-semibold text-purple-600 border border-purple-200 rounded-lg px-4 py-2 hover:bg-purple-50"
          >
            {showWaived ? "Hide waived" : "Show waived too"}
          </button>
        </div>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        {loading ? (
          <p className="text-gray-500">Loading strikes...</p>
        ) : visible.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center">
            <p className="text-gray-500">No strikes to show.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((s) => (
              <div key={s.id} className="bg-white border rounded-xl p-5">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {s.teacherName}
                      <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                        {activeCount.get(s.teacherId) ?? 0} active
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {REASON_LABEL[s.reason]}
                      {s.courseTitle ? ` · ${s.courseTitle}` : ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Class {at(s.classStartsAt)} · recorded {at(s.recordedAt)}
                    </p>
                  </div>

                  {s.waivedAt ? (
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                      Waived
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setWaiving(s)}
                      className="text-sm font-semibold text-purple-600 border border-purple-200 rounded-lg px-4 py-2 hover:bg-purple-50"
                    >
                      Waive
                    </button>
                  )}
                </div>

                {s.waivedAt && (
                  <p className="text-xs text-gray-500 mt-3">
                    Waived {at(s.waivedAt)}
                    {s.waivedByName ? ` by ${s.waivedByName}` : ""}: {s.waiveReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {waiving && (
        <WaiveModal
          strike={waiving}
          onCancel={() => setWaiving(null)}
          onSubmit={async (reason) => {
            const result = await waive(waiving.id, reason);

            if (!result.ok) return result.error ?? "Failed to waive this strike.";

            setWaiving(null);

            return null;
          }}
        />
      )}
    </div>
  );
}
