"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Video } from "lucide-react";

/**
 * Clicking "Join Session" (UpcomingLecturesCard) lands here. There's
 * no real video room to drop into yet — Jitsi is still undecided
 * (06-OPEN-DECISIONS.md #18, no code exists) — so this is
 * intentionally a simple placeholder rather than a real call screen,
 * per direct instruction to keep this simple for now. The Teacher's
 * "Start Session" is what actually marks the class complete; this
 * page doesn't call any API.
 */
export default function JoinClassSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  // sessionId isn't used yet (no real room to join), but the route
  // takes it so this can be wired to a real video destination later
  // without changing the Join button's link.
  use(params);
  const router = useRouter();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
      <span className="w-14 h-14 rounded-2xl bg-violet-100 text-brand flex items-center justify-center mb-4">
        <Video size={26} />
      </span>
      <p className="text-gray-800 font-semibold">You&apos;re in the session.</p>
      <p className="text-sm text-gray-500 mt-1 max-w-sm">
        Live video isn&apos;t wired up yet — your teacher will start the
        class from their side. This screen is a placeholder until video
        calling is added.
      </p>
      <button
        type="button"
        onClick={() => router.replace("/parent")}
        className="mt-5 text-sm font-bold text-white bg-brand hover:bg-brand-dark px-4 py-2.5 rounded-full transition-colors"
      >
        Back to home
      </button>
    </div>
  );
}
