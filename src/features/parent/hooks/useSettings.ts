"use client";

import { useEffect, useState } from "react";

export interface ParentSettingsData {
  notificationsEnabled: boolean;
}

/**
 * Backs the new `/parent/settings` page (ParentSidebar.tsx already
 * linked here — previously a dead link, same pattern Reschedule/
 * Homework/Leave/Profile all went through before they got built out).
 */
export function useSettings() {
  const [settings, setSettings] = useState<ParentSettingsData | null>(null);
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

      const res = await fetch("/api/parent/settings");
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
    // Optimistic update, reverted below if the save fails — the
    // toggle should feel instant rather than waiting on a round trip.
    const previous = settings;
    setSettings((prev) => (prev ? { ...prev, notificationsEnabled: next } : prev));
    setError("");

    try {
      setSaving(true);

      const res = await fetch("/api/parent/settings", {
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
