"use client";

import { Suspense } from "react";

import HubTabs from "@/features/shared/components/HubTabs";
import CalendarView from "@/features/parent/components/views/CalendarView";
import RescheduleView from "@/features/parent/components/views/RescheduleView";

export default function ParentCalendarHubPage() {
  return (
    <Suspense fallback={null}>
      <HubTabs
        defaultTab="schedule"
        tabs={[
          { key: "schedule", label: "Calendar", content: <CalendarView /> },
          { key: "reschedule", label: "Reschedule requests", content: <RescheduleView /> },
        ]}
      />
    </Suspense>
  );
}
