"use client";

import { Suspense } from "react";

import CoursesView from "@/features/parent/components/views/CoursesView";

/** Parent → Group classes: approved courses whose Class type is "Group". */
export default function ParentGroupClassesPage() {
  return (
    <div className="mx-auto max-w-[1160px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
      <header>
        <h1 className="font-heading text-[26px] font-semibold leading-[1.15] text-pd-ink outline-none sm:text-[32px]">
          Group classes
        </h1>
        <p className="text-sm text-pd-ink3">Approved classes where several students learn together.</p>
      </header>

      <Suspense fallback={null}>
        <CoursesView groupOnly />
      </Suspense>
    </div>
  );
}
