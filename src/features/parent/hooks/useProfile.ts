"use client";

import { useEffect, useState } from "react";

export interface ParentProfileData {
  id: string;
  firstName: string;
  lastName: string;
  visibleName: string | null;
  email: string;
  phone: string;
  whatsappNumber: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  pincode: string | null;
  preferredLanguage: string | null;
  modeOfCommunication: string | null;
  createdAt: string;
}

export type ParentProfileFormFields = Pick<
  ParentProfileData,
  | "firstName"
  | "lastName"
  | "visibleName"
  | "phone"
  | "whatsappNumber"
  | "address"
  | "city"
  | "country"
  | "pincode"
  | "preferredLanguage"
  | "modeOfCommunication"
>;

/**
 * Backs the new `/parent/profile` page (ParentSidebar.tsx already
 * linked here — it was previously a dead link with no page behind
 * it, same pattern as Referral/Wallet/Calendar before those got
 * built out).
 */
export function useProfile() {
  const [profile, setProfile] = useState<ParentProfileData | null>(null);
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

      const res = await fetch("/api/parent/profile");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load your profile.");
      }

      setProfile(data.parent);
    } catch (err) {
      console.error(err);
      setError("Unable to load your profile.");
    } finally {
      setLoading(false);
    }
  }

  async function save(fields: Partial<ParentProfileFormFields>) {
    try {
      setSaving(true);
      setError("");

      const res = await fetch("/api/parent/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update your profile.");
      }

      setProfile(data.parent);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update your profile.";
      setError(message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { profile, loading, saving, error, save };
}
