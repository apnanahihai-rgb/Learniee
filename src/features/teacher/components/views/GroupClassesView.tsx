"use client";

import { UsersRound } from "lucide-react";

import TeacherCourseCard from "@/features/teacher/components/courses/TeacherCourseCard";
import { PdEmpty, GridSkeleton } from "@/features/parent/components/courses/pdUi";
import { Section, Tag } from "@/features/parent/components/home/HomeBits";
import { useTeacherCourses } from "@/features/courses/hooks/useTeacherCourses";
import { isGroupType } from "@/features/courses/utils/groupClass";
import PdErrorState from "@/features/shared/components/PdErrorState";

const GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2 min-[1180px]:grid-cols-3";

/**
 * The Teacher's own group classes (courses whose Class type is "Group"):
 * approved first, then the ones waiting for Admin. Data: GET /api/teacher/course.
 */
export default function GroupClassesView() {
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

  const groups = courses.filter((c) => isGroupType(c.type));
  const approved = groups.filter((c) => c.status === "APPROVED");
  const underReview = groups.filter((c) => c.status === "UNDER_REVIEW");

  return (
    <div className="mt-6 flex flex-col gap-6">
      <Section id="groups-approved" title="Approved" action={<Tag tone="green">{approved.length}</Tag>}>
        {approved.length === 0 ? (
          <div className="rounded-2xl border border-pd-line bg-white">
            <PdEmpty
              icon={UsersRound}
              title="No approved group classes yet"
              text="Create a group class, and once the admin approves it, it appears here and in the course list."
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
          id="groups-review"
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
