"use client";

import { Suspense } from "react";

import PdHubTabs from "@/features/parent/components/PdHubTabs";
import ProfileView from "@/features/teacher/components/views/ProfileView";
import SettingsView from "@/features/teacher/components/views/SettingsView";

/** Your profile and settings. */
export default function TeacherAccountHubPage() {
  return (
    <Suspense fallback={null}>
      <PdHubTabs
        title="Account"
        subtitle="Your profile and settings."
        defaultTab="profile"
        tabs={[
          { key: "profile", label: "Profile", content: <ProfileView /> },
          { key: "settings", label: "Settings", content: <SettingsView /> },
        ]}
      />
    </Suspense>
  );
}
