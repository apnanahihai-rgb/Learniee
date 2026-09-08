"use client";

import { useEffect, useState } from "react";

export interface ReferralEntry {
  id: string;
  status: "PENDING" | "REWARDED";
  rewardAmount: string;
  rewardedAt: string | null;
  createdAt: string;
  referee: {
    firstName: string;
    lastName: string;
    visibleName: string | null;
  };
}

export interface ReferralSummary {
  code: string;
  referrals: ReferralEntry[];
  totalEarned: number;
  pendingCount: number;
  rewardAmount: number;
}

export function useReferral() {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);

      const res = await fetch("/api/parent/referral");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load referral details");
      }

      setSummary(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load your referral details.");
    } finally {
      setLoading(false);
    }
  }

  return { summary, loading, error };
}
