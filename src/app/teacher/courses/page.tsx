"use client";

import { Suspense } from "react";

import HubTabs from "@/features/shared/components/HubTabs";
import CourseManagementView from "@/features/teacher/components/views/CourseManagementView";
import VacancyView from "@/features/teacher/components/views/VacancyView";

export default function TeacherCoursesHubPage() {
  return (
    <Suspense fallback={null}>
      <HubTabs
        defaultTab="courses"
        tabs={[
          { key: "courses", label: "Courses", content: <CourseManagementView /> },
          { key: "vacancies", label: "Vacancies", content: <VacancyView /> },
        ]}
      />
    </Suspense>
  );
}
