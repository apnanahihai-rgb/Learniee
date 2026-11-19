"use client";

import { Suspense } from "react";

import PdHubTabs from "@/features/parent/components/PdHubTabs";
import TeacherLeaveTab from "@/features/teacher/components/calendar/TeacherLeaveTab";
import TeacherScheduleTab from "@/features/teacher/components/calendar/TeacherScheduleTab";
import AvailabilityView from "@/features/teacher/components/views/AvailabilityView";

export default function TeacherCalendarHubPage() {
  return (
    <Suspense fallback={null}>
      <PdHubTabs
        title="Calendar"
        subtitle="Your classes, demos and time off. All times are IST."
        defaultTab="schedule"
        tabs={[
          { key: "schedule", label: "Schedule", content: <TeacherScheduleTab /> },
          {
            key: "availability",
            label: "Availability",
            content: (
              <div className="mt-5 rounded-2xl border border-pd-line bg-white">
                <AvailabilityView />
              </div>
            ),
          },
          { key: "leave", label: "Leave", content: <TeacherLeaveTab /> },
        ]}
      />
    </Suspense>
  );
}
