"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpenCheck, Search } from "lucide-react";

import { useApprovedCourses } from "@/features/parent/hooks/useApprovedCourses";
import CourseCard from "@/features/parent/components/CourseCard";

/**
 * `/parent/courses` — the page the sidebar's "Courses" nav item was
 * always pointing to, but which never had a `page.tsx` (only the
 * `[courseId]` detail route existed under this folder), so clicking
 * it 404'd. This is the same approved-courses list already shown on
 * `/parent`, pulled out into its own dedicated browse page, with a
 * simple client-side title/subject search since a full list with no
 * way to narrow it down isn't very browsable once there are more
 * than a handful of courses.
 */
export default function ParentCoursesPage() {
  const { courses, loading, error } = useApprovedCourses();
  const [query, setQuery] = useState("");

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;

    return courses.filter((course) => {
      const haystack = [
        course.courseTitle,
        course.subject,
        course.grade,
        course.board,
        course.teacher.visibleName,
        course.teacher.firstName,
        course.teacher.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [courses, query]);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
            <BookOpenCheck size={18} />
          </span>
          <h1 className="font-heading text-lg font-bold text-gray-800">
            Courses
          </h1>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by subject, teacher, title..."
            className="w-full text-sm border border-violet-100 rounded-full pl-9 pr-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="rounded-3xl border border-violet-100 bg-violet-50/60 animate-pulse min-h-[19rem]"
            />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-8 text-center">
          <p className="text-gray-500">
            No courses are available yet. Check back once teachers have
            published courses and Admin has approved them.
          </p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-violet-200 rounded-3xl p-8 text-center">
          <p className="text-gray-500">
            No courses match &quot;{query}&quot; — try a different search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredCourses.map((course) => (
            <Link key={course.id} href={`/parent/courses/${course.id}`}>
              <CourseCard course={course} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
