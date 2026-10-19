"use client";

import { Suspense } from "react";

import HubTabs from "@/features/shared/components/HubTabs";
import ProfileView from "@/features/parent/components/views/ProfileView";
import StudentsView from "@/features/parent/components/views/StudentsView";
import SettingsView from "@/features/parent/components/views/SettingsView";

export default function ParentAccountHubPage() {
  return (
    <Suspense fallback={null}>
      <HubTabs
        defaultTab="profile"
        tabs={[
          { key: "profile", label: "Profile", content: <ProfileView /> },
          { key: "students", label: "Students", content: <StudentsView /> },
          { key: "settings", label: "Settings", content: <SettingsView /> },
        ]}
      />
    </Suspense>
  );
}
