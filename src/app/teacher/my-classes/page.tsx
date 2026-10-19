"use client";

import { Suspense } from "react";

import HubTabs from "@/features/shared/components/HubTabs";
import MyClassesView from "@/features/teacher/components/views/MyClassesView";
import EnrollmentsView from "@/features/teacher/components/views/EnrollmentsView";
import HomeworkTestsView from "@/features/teacher/components/views/HomeworkTestsView";
import ResourcesView from "@/features/teacher/components/views/ResourcesView";
import CertificatesView from "@/features/teacher/components/views/CertificatesView";
import ChatListView from "@/features/teacher/components/views/ChatListView";

export default function TeacherMyClassesHubPage() {
  return (
    <Suspense fallback={null}>
      <HubTabs
        defaultTab="classes"
        tabs={[
          { key: "classes", label: "Classes", content: <MyClassesView /> },
          { key: "students", label: "Students", content: <EnrollmentsView mode="students" /> },
          { key: "homework", label: "Homework", content: <HomeworkTestsView /> },
          { key: "resources", label: "Resources", content: <ResourcesView /> },
          { key: "certificates", label: "Certificates", content: <CertificatesView /> },
          { key: "chat", label: "Chat", content: <ChatListView /> },
        ]}
      />
    </Suspense>
  );
}
