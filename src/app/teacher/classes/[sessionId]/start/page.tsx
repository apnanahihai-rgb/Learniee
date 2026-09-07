"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

/**
 * Clicking "Start Session" (UpcomingLecturesCard) lands here rather
 * than jumping straight into a call — deliberately simple for now,
 * per direct instruction: no real video room exists yet (Jitsi is
 * still undecided, 06-OPEN-DECISIONS.md #18). This page's job is
 * just to show a loader, mark the underlying `ClassSession` complete
 * via the existing `PATCH /api/teacher/class-sessions/[id]/complete`
 * endpoint (classSession.service.ts — the same one the per-enrollment
 * Sessions list already used), then send the Teacher back home.
 * Completion is a single shared `ClassSession` row, so it's reflected
 * on both the Teacher's and Parent's side immediately — nothing
 * separate to update on the Parent's account.
 *
 * This replaces the old blind "Mark next session complete" one-click
 * button (removed from EnrollmentApprovalCard) as the primary
 * completion path — per direct instruction, kept intentionally
 * simple for now.
 */
export default function StartClassSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [state, setState] = useState<"starting" | "done" | "error">("starting");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch(`/api/teacher/class-sessions/${sessionId}/complete`, {
          method: "PATCH",
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to start this session.");
        }

        if (cancelled) return;
        setState("done");

        setTimeout(() => {
          if (!cancelled) router.replace("/teacher");
        }, 1200);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setState("error");
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
      {state === "starting" && (
        <>
          <Loader2 size={40} className="animate-spin text-brand mb-4" />
          <p className="text-gray-700 font-semibold">Starting the session…</p>
          <p className="text-sm text-gray-400 mt-1">Please wait a moment.</p>
        </>
      )}

      {state === "done" && (
        <>
          <CheckCircle2 size={40} className="text-green-600 mb-4" />
          <p className="text-gray-800 font-semibold">
            Session started — marked complete.
          </p>
          <p className="text-sm text-gray-500 mt-1">Taking you back home…</p>
        </>
      )}

      {state === "error" && (
        <>
          <XCircle size={40} className="text-red-500 mb-4" />
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button
            type="button"
            onClick={() => router.replace("/teacher")}
            className="text-sm font-bold text-white bg-brand hover:bg-brand-dark px-4 py-2.5 rounded-full transition-colors"
          >
            Back to home
          </button>
        </>
      )}
    </div>
  );
}
