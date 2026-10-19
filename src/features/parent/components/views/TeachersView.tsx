"use client";

import Link from "next/link";
import { Star } from "lucide-react";

import { useApprovedCourses } from "@/features/parent/hooks/useApprovedCourses";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

/**
 * "Teachers" tab of Find a Course. There is no teacher-directory API, so the
 * list is built from the teachers behind the approved courses the parent can
 * already see; each card opens that teacher's profile page.
 */
export default function TeachersView() {
  const { courses, loading, error } = useApprovedCourses();

  const teachers = new Map<
    string,
    {
      id: string;
      name: string;
      rating: number | null;
      reviewCount: number;
      subjects: Set<string>;
    }
  >();

  for (const course of courses) {
    const t = course.teacher;
    const existing = teachers.get(course.teacherId);
    const entry = existing ?? {
      id: course.teacherId,
      name: t.visibleName || `${t.firstName} ${t.lastName}`.trim(),
      rating: t.averageRating,
      reviewCount: t.reviewCount,
      subjects: new Set<string>(),
    };
    if (course.subject) entry.subjects.add(course.subject);
    teachers.set(course.teacherId, entry);
  }

  const list = [...teachers.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="p-5 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-purple-600 sm:text-3xl">Teachers</h1>
        <p className="mb-6 mt-1 text-gray-500">
          Teachers who currently have approved courses. Open a profile to see
          their background, courses and reviews.
        </p>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        {loading ? (
          <p className="text-gray-600">Loading teachers…</p>
        ) : list.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center">
            <p className="text-gray-500">No teachers to show yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((teacher) => (
              <Link
                key={teacher.id}
                href={`/parent/teachers/${teacher.id}`}
                className="rounded-2xl border bg-white p-5 transition-colors hover:border-brand-light"
              >
                <p className="font-semibold text-gray-800">{teacher.name}</p>
                {teacher.subjects.size > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    {[...teacher.subjects].join(" · ")}
                  </p>
                )}
                <p className="mt-3 flex items-center gap-1 text-xs text-gray-500">
                  <Star size={13} className="text-amber-400" />
                  {teacher.rating !== null
                    ? `${teacher.rating.toFixed(1)} (${teacher.reviewCount})`
                    : "No reviews yet"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
