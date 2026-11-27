"use client";

import { Suspense } from "react";

import PdHubTabs from "@/features/parent/components/PdHubTabs";
import ClassesTab from "@/features/teacher/components/my-classes/ClassesTab";
import GroupClassesTab from "@/features/teacher/components/my-classes/GroupClassesTab";
import StudentsTab from "@/features/teacher/components/my-classes/StudentsTab";
import HomeworkTab from "@/features/teacher/components/my-classes/HomeworkTab";
import ResourcesTab from "@/features/teacher/components/my-classes/ResourcesTab";
import CertificatesTab from "@/features/teacher/components/my-classes/CertificatesTab";
import ChatListView from "@/features/teacher/components/views/ChatListView";

export default function TeacherMyClassesHubPage() {
  return (
    <Suspense fallback={null}>
      <PdHubTabs
        title="My classes"
        subtitle="Every course you teach, with its students, homework and resources."
        defaultTab="classes"
        tabs={[
          { key: "classes", label: "Classes", content: <ClassesTab /> },
          { key: "groups", label: "Group classes", content: <GroupClassesTab /> },
          { key: "students", label: "Students", content: <StudentsTab /> },
          { key: "homework", label: "Homework", content: <HomeworkTab /> },
          { key: "resources", label: "Resources", content: <ResourcesTab /> },
          { key: "certificates", label: "Certificates", content: <CertificatesTab /> },
          { key: "chat", label: "Chat", content: <ChatListView /> },
        ]}
      />
    </Suspense>
  );
}
