"use client";

import { Suspense } from "react";

import PdHubTabs from "@/features/parent/components/PdHubTabs";
import DemoRequestsTab from "@/features/teacher/components/requests/DemoRequestsTab";
import EnrollmentRequestsTab from "@/features/teacher/components/requests/EnrollmentRequestsTab";
import RescheduleRequestsTab from "@/features/teacher/components/requests/RescheduleRequestsTab";
import { useTeacherRequestCount } from "@/features/teacher/hooks/useTeacherRequestCount";

/** Everything waiting for the teacher's answer, with a count on each tab. */
export default function TeacherRequestsHubPage() {
  const { enrollments, reschedules } = useTeacherRequestCount();

  return (
    <Suspense fallback={null}>
      <PdHubTabs
        title="Requests"
        subtitle="New enrollments, demos and reschedules."
        defaultTab="enrollments"
        tabs={[
          { key: "enrollments", label: "Enrollments", badge: enrollments, content: <EnrollmentRequestsTab /> },
          { key: "demos", label: "Demos", content: <DemoRequestsTab /> },
          { key: "reschedules", label: "Reschedules", badge: reschedules, content: <RescheduleRequestsTab /> },
        ]}
      />
    </Suspense>
  );
}
