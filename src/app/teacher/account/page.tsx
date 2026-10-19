"use client";

import { Suspense } from "react";

import HubTabs from "@/features/shared/components/HubTabs";
import ProfileView from "@/features/teacher/components/views/ProfileView";
import SettingsView from "@/features/teacher/components/views/SettingsView";

export default function TeacherAccountHubPage() {
  return (
    <Suspense fallback={null}>
      <HubTabs
        defaultTab="profile"
        tabs={[
          { key: "profile", label: "Profile", content: <ProfileView /> },
          { key: "settings", label: "Settings", content: <SettingsView /> },
        ]}
      />
    </Suspense>
  );
}
