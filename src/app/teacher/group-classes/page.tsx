"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import PdHubTabs from "@/features/parent/components/PdHubTabs";
import { PD_BTN_PRI } from "@/features/parent/components/courses/pdUi";
import GroupClassesTab from "@/features/teacher/components/my-classes/GroupClassesTab";

/** Teacher → Group classes: manage the group classes that are running (classes, join link, homework, announcements). */
export default function TeacherGroupClassesPage() {
  return (
    <Suspense fallback={null}>
      <PdHubTabs
        title="Group classes"
        subtitle="Manage your running group classes: next class, students, homework and announcements."
        action={
          <Link href="/teacher/course-management/new?type=group" className={PD_BTN_PRI}>
            <Plus size={16} />
            Create group class
          </Link>
        }
        tabs={[{ key: "groups", label: "Group classes", content: <GroupClassesTab /> }]}
        defaultTab="groups"
      />
    </Suspense>
  );
}
