"use client";

import { useState } from "react";
import { Inbox } from "lucide-react";

import { useTeacherVacancies } from "@/features/class-requests/hooks/useClassRequests";
import {
  GridSkeleton,
  PD_BTN_DNG,
  PD_BTN_PRI,
  PD_BTN_SEC,
  PD_LABEL,
  PdEmpty,
} from "@/features/parent/components/courses/pdUi";
import PdDialog from "@/features/shared/components/PdDialog";
import PdErrorState from "@/features/shared/components/PdErrorState";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import TeacherVacancyCard from "@/features/teacher/components/courses/TeacherVacancyCard";

type Pending = { kind: "accept" | "decline"; id: string } | null;

/**
 * "Vacancies" tab of /teacher/courses. Classes parents asked for that aren't
 * in the catalogue, vetted and circulated by Admin. A response is final;
 * accepting leads to creating the course listing. No parent details are shown.
 * Data: GET /api/teacher/class-requests, PATCH /api/teacher/class-requests/[id]
 * (see `classRequest.service.ts`).
 */
export default function VacancyView() {
  const { vacancies, loading, error, busyId, respond, reload } = useTeacherVacancies();
  const [pending, setPending] = useState<Pending>(null);
  const [note, setNote] = useState("");

  function close() {
    setPending(null);
    setNote("");
  }

  async function confirm() {
    if (!pending) return;
    const ok = await respond(
      pending.id,
      pending.kind === "accept" ? "ACCEPT" : "DECLINE",
      pending.kind === "decline" ? note.trim() || undefined : undefined,
    );
    if (ok) close();
  }

  const busy = pending !== null && busyId === pending.id;

  if (loading) {
    return (
      <div className="mt-6">
        <GridSkeleton count={2} height={190} />
      </div>
    );
  }

  if (error && vacancies.length === 0) {
    return (
      <div className="mt-6">
        <PdErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  return (
    <>
      <p className="mt-5 text-[13px] text-pd-ink3">
        Classes families are looking for. Accept one you can teach, then list a course for it.
      </p>

      <div className="mt-3">
        {error && <ErrorBanner>{error}</ErrorBanner>}

        {vacancies.length === 0 ? (
          <div className="rounded-2xl border border-pd-line bg-white">
            <PdEmpty
              icon={Inbox}
              title="No open vacancies"
              text="You’ll be notified when a new one is posted."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {vacancies.map((v) => (
              <TeacherVacancyCard
                key={v.id}
                vacancy={v}
                busy={busyId === v.id}
                onAccept={() => setPending({ kind: "accept", id: v.id })}
                onDecline={() => setPending({ kind: "decline", id: v.id })}
              />
            ))}
          </div>
        )}
      </div>

      {pending?.kind === "accept" && (
        <PdDialog
          title="Accept this class?"
          onClose={close}
          footer={
            <>
              <button type="button" onClick={close} className={PD_BTN_SEC}>
                Cancel
              </button>
              <button type="button" disabled={busy} onClick={confirm} className={PD_BTN_PRI}>
                {busy ? "Saving..." : "Accept"}
              </button>
            </>
          }
        >
          <p>Your response is final. After accepting, list a course for it so parents can join.</p>
        </PdDialog>
      )}

      {pending?.kind === "decline" && (
        <PdDialog
          title="Decline this class?"
          onClose={close}
          footer={
            <>
              <button type="button" onClick={close} className={PD_BTN_SEC}>
                Cancel
              </button>
              <button type="button" disabled={busy} onClick={confirm} className={PD_BTN_DNG}>
                {busy ? "Saving..." : "Decline"}
              </button>
            </>
          }
        >
          <p>Your response is final.</p>
          <div className="flex flex-col gap-2">
            <label htmlFor="vacancy-decline-note" className={PD_LABEL}>
              Reason (optional)
            </label>
            <textarea
              id="vacancy-decline-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              className="min-h-24 w-full resize-y rounded-xl border border-pd-line2 p-3 text-sm text-pd-ink outline-none transition focus:border-pd-brand focus:ring-4 focus:ring-pd-b100"
            />
          </div>
        </PdDialog>
      )}
    </>
  );
}
