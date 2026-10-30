"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import AvailabilityEditor from "./AvailabilityEditor";
import { useTeacherAvailability } from "@/features/teacher/hooks/useAvailability";

const DISMISS_KEY = "learniee:availability-popup-dismissed";

/**
 * Popup shown to an approved Teacher who hasn't set weekly availability yet
 * (new approvals and existing teachers alike). "Later" hides it for this
 * browser session only — the server still refuses course creation until a
 * week is saved. Hidden on the Calendar page, where the editor already is.
 */
export default function AvailabilityGate() {
  const pathname = usePathname();
  const { slots, loading, loadFailed, saving, error, save } = useTeacherAvailability();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (loading || loadFailed || slots.length > 0 || dismissed) return null;
  if (pathname?.startsWith("/teacher/calendar")) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="availability-popup-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6"
    >
      <div className="w-full max-w-xl max-h-full overflow-y-auto rounded-3xl bg-white p-5 sm:p-6 shadow-xl">
        <h2 id="availability-popup-title" className="font-heading text-lg font-bold text-gray-800">
          Set your weekly availability
        </h2>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          Choose the days and times you can teach. You need this before you can
          create a course, and parents will only be able to book demos and
          classes inside these timings. You can edit it any time from Calendar.
        </p>

        <AvailabilityEditor
          initialSlots={[]}
          saving={saving}
          error={error}
          onSave={(next) => save(next)}
        />

        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem(DISMISS_KEY, "1");
            } catch {
              /* private mode — just hide for now */
            }
            setDismissed(true);
          }}
          className="mt-3 w-full text-xs font-semibold text-gray-500 hover:text-gray-700"
        >
          Later
        </button>
      </div>
    </div>
  );
}
