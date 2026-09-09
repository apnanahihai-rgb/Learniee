"use client";

import { useEffect, useState } from "react";

export interface AdminProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

export type AdminProfileFormFields = Pick<AdminProfileData, "firstName" | "lastName">;

/** Backs the new `/admin/profile` page, linked from the Admin dashboard header. */
export function useProfile() {
  const [profile, setProfile] = useState<AdminProfileData | null>(null);
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

      const res = await fetch("/api/admin/profile");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load the admin profile.");
      }

      setProfile(data.admin);
    } catch (err) {
      console.error(err);
      setError("Unable to load the admin profile.");
    } finally {
      setLoading(false);
    }
  }

  async function save(fields: Partial<AdminProfileFormFields>) {
    try {
      setSaving(true);
      setError("");

      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update the admin profile.");
      }

      setProfile(data.admin);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update the admin profile.";
      setError(message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { profile, loading, saving, error, save };
}
