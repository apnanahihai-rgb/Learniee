"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import AvailabilityEditor from "@/features/teacher/components/availability/AvailabilityEditor";
import { useTeacherAvailability } from "@/features/teacher/hooks/useAvailability";

/** Calendar → Availability tab: edit the weekly timings Parents can book. */
export default function AvailabilityView() {
  const { slots, loading, loadFailed, saving, error, save } = useTeacherAvailability();
  const [saved, setSaved] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-violet-600" />
      </div>
    );
  }

  if (loadFailed) {
    return <p className="p-6 text-sm text-red-600">Couldn&apos;t load your availability. Refresh to try again.</p>;
  }

  return (
    <div className="max-w-2xl p-4 sm:p-6">
      <h2 className="font-heading text-lg font-bold text-gray-800">Weekly availability</h2>
      <p className="text-sm text-gray-500 mt-1 mb-4">
        Parents can only book demos and regular classes inside these timings.
        Changes apply to new bookings; classes already booked are not moved.
      </p>

      <AvailabilityEditor
        // Re-mount when the saved week changes (e.g. refreshed from another tab).
        key={JSON.stringify(slots)}
        initialSlots={slots}
        saving={saving}
        error={error}
        onSave={async (next) => {
          setSaved(false);
          setSaved(await save(next));
        }}
      />

      {saved && !saving && (
        <p className="text-xs text-emerald-600 font-semibold mt-3">Availability saved.</p>
      )}
    </div>
  );
}
