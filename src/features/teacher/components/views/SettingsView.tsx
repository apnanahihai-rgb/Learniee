"use client";

import PdChangePasswordCard from "@/features/parent/components/account/PdChangePasswordCard";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";
import { PD_CARD_FLUSH, PdBanner, PdSkeleton } from "@/features/parent/components/payments/paymentsUi";
import { useSettings } from "@/features/teacher/hooks/useSettings";

/**
 * "Settings" tab of Account (teacher design: switch rows in one card). Only the in-app
 * notification master switch exists in the backend (`/api/teacher/settings`); per-type
 * switches stay Phase 2 (06 #32). Change password uses `/api/auth/change-password`.
 */
export default function SettingsView() {
  const { settings, loading, saving, error, setNotificationsEnabled } = useSettings();
  const { toast, toastNode } = usePdToast();

  const enabled = settings?.notificationsEnabled ?? true;

  async function toggle(next: boolean) {
    const ok = await setNotificationsEnabled(next);
    if (ok) toast(`In-app notifications ${next ? "on" : "off"}`);
  }

  return (
    <div className="mt-5 flex max-w-[720px] flex-col gap-5">
      {error && <PdBanner tone="red">{error}</PdBanner>}

      {loading ? (
        <>
          <PdSkeleton height={80} />
          <PdSkeleton height={330} />
        </>
      ) : (
        <>
          <section className={PD_CARD_FLUSH}>
            <div className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <b id="notif-label" className="block text-sm font-semibold text-pd-ink">
                  In-app notifications
                </b>
                <small className="text-[13px] text-pd-ink3">
                  Class, request and payout alerts. Turning this off stops new notifications; it
                  won’t clear existing ones.
                </small>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-labelledby="notif-label"
                disabled={saving}
                onClick={() => toggle(!enabled)}
                className={`relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                  enabled ? "bg-pd-brand" : "bg-pd-line2"
                }`}
              >
                <span
                  className={`absolute left-[3px] top-[3px] size-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    enabled ? "translate-x-[22px]" : ""
                  }`}
                />
              </button>
            </div>
          </section>

          <PdChangePasswordCard onDone={toast} />
        </>
      )}

      {toastNode}
    </div>
  );
}
