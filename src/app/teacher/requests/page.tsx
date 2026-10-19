"use client";

import { Suspense } from "react";

import HubTabs from "@/features/shared/components/HubTabs";
import EnrollmentsView from "@/features/teacher/components/views/EnrollmentsView";
import DemoView from "@/features/teacher/components/views/DemoView";
import RescheduleView from "@/features/teacher/components/views/RescheduleView";
import { useTeacherRequestCount } from "@/features/teacher/hooks/useTeacherRequestCount";

/** Everything waiting for the teacher's answer, with a count on each tab. */
export default function TeacherRequestsHubPage() {
  const { enrollments, reschedules } = useTeacherRequestCount();

  return (
    <Suspense fallback={null}>
      <HubTabs
        defaultTab="enrollments"
        tabs={[
          {
            key: "enrollments",
            label: "Enrollments",
            badge: enrollments,
            content: <EnrollmentsView mode="requests" />,
          },
          { key: "demos", label: "Demos", content: <DemoView /> },
          {
            key: "reschedules",
            label: "Reschedules",
            badge: reschedules,
            content: <RescheduleView />,
          },
        ]}
      />
    </Suspense>
  );
}
