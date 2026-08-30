import Link from "next/link";
import { GraduationCap } from "lucide-react";

import CourseCard from "@/features/parent/components/CourseCard";
import type { ParentCourse } from "@/features/parent/types/course";

interface Props {
  teacherName: string;
  courses: ParentCourse[];
}

export default function OtherCoursesByTeacher({ teacherName, courses }: Props) {
  if (courses.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-9 h-9 rounded-xl bg-violet-100 text-brand flex items-center justify-center flex-shrink-0">
          <GraduationCap size={18} />
        </span>
        <h2 className="font-heading text-lg font-bold text-gray-800">
          More from {teacherName}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {courses.map((course) => (
          <Link key={course.id} href={`/parent/courses/${course.id}`}>
            <CourseCard course={course} />
          </Link>
        ))}
      </div>
    </section>
  );
}
