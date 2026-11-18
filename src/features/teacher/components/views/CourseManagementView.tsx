"use client";

import { BookOpen } from "lucide-react";

import TeacherCourseCard from "@/features/teacher/components/courses/TeacherCourseCard";
import { PdEmpty, GridSkeleton } from "@/features/parent/components/courses/pdUi";
import { Section, Tag } from "@/features/parent/components/home/HomeBits";
import { useTeacherCourses } from "@/features/courses/hooks/useTeacherCourses";
import PdErrorState from "@/features/shared/components/PdErrorState";

const GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2 min-[1180px]:grid-cols-3";

/**
 * "My courses" tab of /teacher/courses: approved courses, then the ones
 * waiting for Admin. The page heading, the "Create course" button and the
 * tabs come from the page (PdHubTabs). Data: GET /api/teacher/course.
 */
export default function CourseManagementView() {
  const { courses, loading, error, reloadCourses } = useTeacherCourses();

  if (loading) {
    return (
      <div className="mt-6">
        <GridSkeleton count={3} height={236} />
      </div>
    );
  }

  if (error && courses.length === 0) {
    return (
      <div className="mt-6">
        <PdErrorState message={error} onRetry={reloadCourses} />
      </div>
    );
  }

  const approved = courses.filter((c) => c.status === "APPROVED");
  const underReview = courses.filter((c) => c.status === "UNDER_REVIEW");

  return (
    <div className="mt-6 flex flex-col gap-6">
      <Section id="courses-approved" title="Approved" action={<Tag tone="green">{approved.length}</Tag>}>
        {approved.length === 0 ? (
          <div className="rounded-2xl border border-pd-line bg-white">
            <PdEmpty
              icon={BookOpen}
              title="No approved courses yet"
              text="Courses approved by the admin will appear here."
            />
          </div>
        ) : (
          <div className={GRID}>
            {approved.map((course) => (
              <TeacherCourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </Section>

      {underReview.length > 0 && (
        <Section
          id="courses-review"
          title="Under examination"
          action={<Tag tone="amber">{underReview.length}</Tag>}
        >
          <div className={GRID}>
            {underReview.map((course) => (
              <TeacherCourseCard key={course.id} course={course} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
