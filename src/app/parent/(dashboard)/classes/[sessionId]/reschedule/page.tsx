"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2 } from "lucide-react";

import { useProposeSessionReschedule } from "@/features/parent/hooks/useProposeSessionReschedule";

/**
 * Reached from the "Request a reschedule" picker on
 * /parent/reschedule (the Reschedule page itself), or directly by
 * sessionId. Since the Parent is proposing here, the request goes to
 * the Teacher for approval — see rescheduleRequest.service.ts.
 */
export default function ParentProposeReschedulePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const { submit, submitting, error } = useProposeSessionReschedule(sessionId);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = await submit({
      proposedDate: date,
      proposedTime: time || undefined,
      reason: reason || undefined,
    });

    if (result) setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <CheckCircle2 size={40} className="text-green-600 mb-4" />
        <p className="text-gray-800 font-semibold">Reschedule request sent.</p>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          The teacher will need to approve this before the class actually moves.
        </p>
        <button
          type="button"
          onClick={() => router.replace("/parent/reschedule")}
          className="mt-5 text-sm font-bold text-white bg-brand hover:bg-brand-dark px-4 py-2.5 rounded-full transition-colors"
        >
          View reschedule requests
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-5 sm:p-8">
      <div className="flex items-center gap-2 mb-1">
        <CalendarClock size={20} className="text-brand" />
        <h1 className="font-heading text-xl font-bold text-gray-800">Reschedule class</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Propose a new date/time for this class. The teacher will need to approve it.
      </p>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">New date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">New time (optional)</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Let the teacher know why…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !date}
          className="w-full text-sm font-bold text-white bg-brand hover:bg-brand-dark disabled:opacity-40 px-4 py-3 rounded-full transition-colors"
        >
          {submitting ? "Sending…" : "Send reschedule request"}
        </button>
      </form>
    </div>
  );
}
