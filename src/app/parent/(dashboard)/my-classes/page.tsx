"use client";

import { Suspense } from "react";

import HubTabs from "@/features/shared/components/HubTabs";
import MyClassesView from "@/features/parent/components/views/MyClassesView";
import FreeDemoView from "@/features/parent/components/views/FreeDemoView";
import HomeworkTestsView from "@/features/parent/components/views/HomeworkTestsView";
import ChatListView from "@/features/parent/components/views/ChatListView";
import ResourcesView from "@/features/parent/components/views/ResourcesView";
import CertificatesView from "@/features/parent/components/views/CertificatesView";

export default function ParentMyClassesHubPage() {
  return (
    <Suspense fallback={null}>
      <HubTabs
        defaultTab="courses"
        tabs={[
          { key: "courses", label: "Courses", content: <MyClassesView /> },
          { key: "demos", label: "Demos", content: <FreeDemoView /> },
          { key: "homework", label: "Homework", content: <HomeworkTestsView /> },
          { key: "chat", label: "Chat", content: <ChatListView /> },
          { key: "resources", label: "Resources", content: <ResourcesView /> },
          { key: "certificates", label: "Certificates", content: <CertificatesView /> },
        ]}
      />
    </Suspense>
  );
}
