"use client";

import { useEffect, useState } from "react";

export interface TeacherSettingsData {
  notificationsEnabled: boolean;
}

/**
 * Backs the new `/teacher/settings` page (TeacherSidebar.tsx now
 * links here too). Same shape as the Parent version — see
 * `@/features/parent/hooks/useSettings`.
 */
export function useSettings() {
  const [settings, setSettings] = useState<TeacherSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/teacher/settings");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load your settings.");
      }

      setSettings(data.settings);
    } catch (err) {
      console.error(err);
      setError("Unable to load your settings.");
    } finally {
      setLoading(false);
    }
  }

  async function setNotificationsEnabled(next: boolean) {
    const previous = settings;
    setSettings((prev) => (prev ? { ...prev, notificationsEnabled: next } : prev));
    setError("");

    try {
      setSaving(true);

      const res = await fetch("/api/teacher/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationsEnabled: next }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update your settings.");
      }

      setSettings(data.settings);
      return true;
    } catch (err) {
      setSettings(previous);
      const message = err instanceof Error ? err.message : "Failed to update your settings.";
      setError(message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { settings, loading, saving, error, setNotificationsEnabled };
}
