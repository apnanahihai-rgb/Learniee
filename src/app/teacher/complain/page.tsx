"use client";

import PdPageHead from "@/features/shared/components/PdPageHead";
import TeacherHelpView from "@/features/teacher/components/help/TeacherHelpView";

/**
 * Teacher "Help" sidebar entry (`/teacher/complain`). Pick a department
 * (Accounts / HR / IT), write a subject + description; it stays OPEN until
 * Admin/staff respond. Backend: `/api/teacher/complaints` + `complaint.service.ts`.
 */
export default function TeacherComplainPage() {
  return (
    <div className="mx-auto max-w-[1160px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
      <PdPageHead title="Help & support" subtitle="Send your issue to the right team." />
      <TeacherHelpView />
    </div>
  );
}
