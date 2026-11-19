"use client";

import { useMemo } from "react";

import PdField from "@/features/parent/components/account/PdField";
import { displayName } from "@/features/shared/utils/displayName";
import type { TeacherEnrollment } from "@/features/teacher/hooks/useEnrollments";
import { TD_SELECT } from "./TeacherUi";

/** Enrollments a dialog may target: the ones whose status is in `allowed`. */
export function targetEnrollments(enrollments: TeacherEnrollment[], allowed: ReadonlySet<string>) {
  return enrollments.filter((e) => allowed.has(e.status));
}

/**
 * Course + student pickers for the "Assign homework" / "Share a resource" dialogs.
 * The design is per course, but the data is per student, so "All students" fans
 * out to every matching enrollment of that course.
 */
export default function TargetFields({
  idPrefix,
  enrollments,
  courseId,
  studentId,
  onCourse,
  onStudent,
  error,
}: {
  idPrefix: string;
  enrollments: TeacherEnrollment[];
  courseId: string;
  studentId: string;
  onCourse: (id: string) => void;
  onStudent: (id: string) => void;
  error?: string;
}) {
  const courses = useMemo(() => {
    const seen = new Map<string, string>();

    for (const e of enrollments) {
      if (!seen.has(e.course.id)) seen.set(e.course.id, e.course.courseTitle ?? e.course.subject ?? "Course");
    }

    return [...seen].map(([id, label]) => ({ id, label }));
  }, [enrollments]);

  const students = enrollments.filter((e) => e.course.id === courseId);

  return (
    <>
      <PdField id={`${idPrefix}-course`} label="Course" error={error}>
        <select
          id={`${idPrefix}-course`}
          className={TD_SELECT}
          value={courseId}
          onChange={(ev) => {
            onCourse(ev.target.value);
            onStudent("all");
          }}
        >
          <option value="" disabled>
            Select a course
          </option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </PdField>

      {students.length > 1 && (
        <PdField id={`${idPrefix}-student`} label="Students">
          <select
            id={`${idPrefix}-student`}
            className={TD_SELECT}
            value={studentId}
            onChange={(ev) => onStudent(ev.target.value)}
          >
            <option value="all">All students ({students.length})</option>
            {students.map((e) => (
              <option key={e.id} value={e.id}>
                {displayName(e.student)}
              </option>
            ))}
          </select>
        </PdField>
      )}
    </>
  );
}

/** Enrollment ids the chosen course + student selection resolves to. */
export function resolveTargetIds(enrollments: TeacherEnrollment[], courseId: string, studentId: string) {
  return enrollments
    .filter((e) => e.course.id === courseId && (studentId === "all" || e.id === studentId))
    .map((e) => e.id);
}
