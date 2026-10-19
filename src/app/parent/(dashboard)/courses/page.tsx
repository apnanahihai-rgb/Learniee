"use client";

import { Suspense } from "react";

import HubTabs from "@/features/shared/components/HubTabs";
import CoursesView from "@/features/parent/components/views/CoursesView";
import TeachersView from "@/features/parent/components/views/TeachersView";
import RequestClassView from "@/features/parent/components/views/RequestClassView";

export default function ParentFindCourseHubPage() {
  return (
    <Suspense fallback={null}>
      <HubTabs
        defaultTab="courses"
        tabs={[
          { key: "courses", label: "Courses", content: <CoursesView /> },
          { key: "teachers", label: "Teachers", content: <TeachersView /> },
          { key: "request", label: "Request a class", content: <RequestClassView /> },
        ]}
      />
    </Suspense>
  );
}
