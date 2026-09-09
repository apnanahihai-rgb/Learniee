"use client";

import { Settings as SettingsIcon } from "lucide-react";

import { useSettings } from "@/features/parent/hooks/useSettings";
import ErrorBanner from "@/features/shared/components/ErrorBanner";
import NotificationToggleCard from "@/features/shared/components/NotificationToggleCard";
import ChangePasswordCard from "@/features/shared/components/ChangePasswordCard";

/**
 * "Settings" sidebar entry — previously a dead link
 * (ParentSidebar.tsx already pointed here, same pattern Reschedule/
 * Homework/Leave/Profile all went through before they got built).
 * Deliberately separate from `/parent/profile`: Profile edits the
 * contact card, Settings controls account-level preferences.
 *
 * MVP-minimal by design — a master in-app notification toggle
 * (06-OPEN-DECISIONS.md #32's fuller bucketed/per-type version stays
 * Phase 2) plus a password-change form.
 */
export default function ParentSettingsPage() {
  const { settings, loading, saving, error, setNotificationsEnabled } = useSettings();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <span className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center flex-shrink-0">
          <SettingsIcon size={22} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Manage your account and notification preferences</p>
        </div>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-violet-50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <NotificationToggleCard
            enabled={settings?.notificationsEnabled ?? true}
            saving={saving}
            onToggle={setNotificationsEnabled}
          />
          <ChangePasswordCard />
        </div>
      )}
    </div>
  );
}
