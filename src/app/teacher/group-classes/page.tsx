"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { PD_BTN_PRI } from "@/features/parent/components/courses/pdUi";
import GroupClassesView from "@/features/teacher/components/views/GroupClassesView";

/** Teacher → Group classes: your group courses + a shortcut to create one. */
export default function TeacherGroupClassesPage() {
  return (
    <div className="mx-auto max-w-[1160px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-[26px] font-semibold leading-[1.15] text-pd-ink outline-none sm:text-[32px]">
            Group classes
          </h1>
          <p className="text-sm text-pd-ink3">Classes where several students learn together.</p>
        </div>
        <Link href="/teacher/course-management/new?type=group" className={PD_BTN_PRI}>
          <Plus size={16} />
          Create group class
        </Link>
      </header>

      <GroupClassesView />
    </div>
  );
}
