"use client";

import { Suspense } from "react";

import HubTabs from "@/features/shared/components/HubTabs";
import CalendarView from "@/features/teacher/components/views/CalendarView";
import AvailabilityView from "@/features/teacher/components/views/AvailabilityView";
import LeaveView from "@/features/teacher/components/views/LeaveView";

export default function TeacherCalendarHubPage() {
  return (
    <Suspense fallback={null}>
      <HubTabs
        defaultTab="schedule"
        tabs={[
          { key: "schedule", label: "Schedule", content: <CalendarView /> },
          { key: "availability", label: "Availability", content: <AvailabilityView /> },
          { key: "leave", label: "Leave", content: <LeaveView /> },
        ]}
      />
    </Suspense>
  );
}
