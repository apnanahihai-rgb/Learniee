"use client";

import Link from "next/link";
import { Star, MapPin, GraduationCap, Briefcase, BadgeCheck } from "lucide-react";

import { useApprovedCourses } from "@/features/parent/hooks/useApprovedCourses";
import ChildAvatar from "@/features/parent/components/ChildAvatar";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

interface TeacherSummary {
  id: string;
  name: string;
  photoUrl: string | null;
  location: string;
  qualifications: string | null;
  experience: string | null;
  isIITian: boolean;
  rating: number | null;
  reviewCount: number;
  courseCount: number;
  subjects: Set<string>;
  grades: Set<string>;
}

const MAX_CHIPS = 3;

/** "5" -> "5 yrs experience"; anything non-numeric is shown as typed. */
function formatExperience(value: string | null): string | null {
  const text = value?.trim();
  if (!text) return null;
  return /^\d+(\.\d+)?$/.test(text) ? `${text} yrs experience` : text;
}

/**
 * "Teachers" tab of Find a Course. There is no teacher-directory API, so the
 * list is built from the teachers behind the approved courses the parent can
 * already see; each card opens that teacher's profile page.
 */
export default function TeachersView() {
  const { courses, loading, error } = useApprovedCourses();

  const teachers = new Map<string, TeacherSummary>();

  for (const course of courses) {
    const t = course.teacher;
    const entry =
      teachers.get(course.teacherId) ??
      {
        id: course.teacherId,
        name: t.visibleName || `${t.firstName} ${t.lastName}`.trim(),
        photoUrl: t.photoUrl ?? null,
        location: [t.city, t.country].filter(Boolean).join(", "),
        qualifications: t.qualifications ?? null,
        experience: t.experience ?? null,
        isIITian: t.isIITian ?? false,
        rating: t.averageRating,
        reviewCount: t.reviewCount,
        courseCount: 0,
        subjects: new Set<string>(),
        grades: new Set<string>(),
      };

    entry.courseCount += 1;
    if (course.subject) entry.subjects.add(course.subject);
    if (course.grade) entry.grades.add(course.grade);
    teachers.set(course.teacherId, entry);
  }

  const list = [...teachers.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="p-5 sm:p-8">
      <div className="mx-auto max-w-5xl">
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((teacher) => {
              const subjects = [...teacher.subjects];
              const experience = formatExperience(teacher.experience);

              return (
                <Link
                  key={teacher.id}
                  href={`/parent/teachers/${teacher.id}`}
                  className="group flex flex-col rounded-3xl border border-violet-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <ChildAvatar src={teacher.photoUrl} name={teacher.name || "Teacher"} size="md" />

                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 font-semibold text-gray-900">
                        <span className="truncate">{teacher.name || "Teacher"}</span>
                        {teacher.isIITian && (
                          <BadgeCheck
                            size={15}
                            className="shrink-0 text-violet-600"
                            aria-label="IITian"
                          />
                        )}
                      </p>

                      <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <Star size={13} className="fill-amber-400 text-amber-400" />
                        {teacher.rating !== null ? (
                          <>
                            <span className="font-semibold text-gray-700">
                              {teacher.rating.toFixed(1)}
                            </span>
                            <span>({teacher.reviewCount})</span>
                          </>
                        ) : (
                          "No reviews yet"
                        )}
                      </p>

                      {teacher.location && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                          <MapPin size={12} className="shrink-0" />
                          <span className="truncate">{teacher.location}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {(teacher.qualifications || experience) && (
                    <ul className="mt-4 space-y-1.5 text-xs text-gray-600">
                      {teacher.qualifications && (
                        <li className="flex items-center gap-2">
                          <GraduationCap size={14} className="shrink-0 text-violet-500" />
                          <span className="line-clamp-1">{teacher.qualifications}</span>
                        </li>
                      )}
                      {experience && (
                        <li className="flex items-center gap-2">
                          <Briefcase size={14} className="shrink-0 text-violet-500" />
                          <span className="line-clamp-1">{experience}</span>
                        </li>
                      )}
                    </ul>
                  )}

                  {subjects.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {subjects.slice(0, MAX_CHIPS).map((subject) => (
                        <span
                          key={subject}
                          className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700"
                        >
                          {subject}
                        </span>
                      ))}
                      {subjects.length > MAX_CHIPS && (
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500">
                          +{subjects.length - MAX_CHIPS}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-violet-50 pt-3 text-xs">
                    <span className="text-gray-500">
                      {teacher.courseCount} {teacher.courseCount === 1 ? "course" : "courses"}
                    </span>
                    <span className="font-semibold text-violet-600 group-hover:underline">
                      View profile
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
