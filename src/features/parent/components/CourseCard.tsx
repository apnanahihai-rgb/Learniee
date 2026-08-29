import { Star, UserCircle } from "lucide-react";
import type { ParentCourse } from "@/features/parent/types/course";

interface Props {
  course: ParentCourse;
}

export default function CourseCard({ course }: Props) {
  const teacherName =
    course.teacher.visibleName ||
    `${course.teacher.firstName} ${course.teacher.lastName}`.trim();

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden w-full max-w-[240px]">
      {/* THUMBNAIL */}
      <div className="h-32 bg-gray-100 relative overflow-hidden">
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnailUrl}
            alt={course.courseTitle || "Course thumbnail"}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-gray-400">Course Thumbnail</p>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-800 leading-snug">
          {course.courseTitle || "Untitled Course"}
        </h3>

        {course.subject && (
          <p className="text-xs text-gray-400 mt-0.5">{course.subject}</p>
        )}

        {/* Teacher */}
        <div className="flex items-center gap-2 mt-3">
          <UserCircle size={22} className="text-gray-400" strokeWidth={1.5} />

          <div className="leading-tight">
            <p className="text-xs font-medium text-gray-700">
              {teacherName || "Teacher"}
            </p>
            <p className="text-[11px] text-gray-400">Group Class</p>
          </div>
        </div>

        {/* Rating — from the teacher-entered Course.rating field.
            No Review/Rating entity exists yet (Month 2, see
            02-ARCHITECTURE.md deferred list), so this is not a
            parent/aggregate rating, just what's on the course record. */}
        {course.rating != null && (
          <div className="flex items-center gap-1 mt-2">
            <Star size={13} className="text-yellow-400 fill-yellow-400" />
            <span className="text-xs text-gray-600">{course.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Enrollment isn't built yet (Enrollment isn't modeled in
            Prisma — see 03-DATA-MODEL.md / 01-PROJECT-STATUS.md).
            This stays disabled until that's built, matching the
            same disabled/"Coming Soon" pattern used on the Admin
            dashboard's placeholder card. */}
        <div className="flex items-center justify-between mt-4">
          {course.price && (
            <span className="text-xs font-medium text-gray-600">
              ₹{course.price}
            </span>
          )}

          <button
            type="button"
            disabled
            title="Enrollment isn't available yet"
            className="ml-auto text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-md cursor-not-allowed"
          >
            JOIN
          </button>
        </div>
      </div>
    </div>
  );
}
