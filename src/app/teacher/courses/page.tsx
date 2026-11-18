"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { PD_BTN_PRI } from "@/features/parent/components/courses/pdUi";
import PdHubTabs from "@/features/parent/components/PdHubTabs";
import CourseManagementView from "@/features/teacher/components/views/CourseManagementView";
import VacancyView from "@/features/teacher/components/views/VacancyView";

export default function TeacherCoursesHubPage() {
  return (
    <Suspense fallback={null}>
      <PdHubTabs
        title="Courses"
        subtitle="Manage what you teach and pick up new requests."
        defaultTab="courses"
        action={
          <Link href="/teacher/course-management/new" className={PD_BTN_PRI}>
            <Plus size={16} />
            Create course
          </Link>
        }
        tabs={[
          { key: "courses", label: "My courses", content: <CourseManagementView /> },
          { key: "vacancies", label: "Vacancies", content: <VacancyView /> },
        ]}
      />
    </Suspense>
  );
}
