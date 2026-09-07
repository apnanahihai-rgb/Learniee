"use client";

import { useEffect, useState } from "react";

export interface ParentWalletRow {
  parentId: string;
  parentName: string;
  email: string;
  balance: number;
  updatedAt: string | null;
}

export interface WalletsSummary {
  totalBalance: number;
  walletCount: number;
}

export function useWallets() {
  const [wallets, setWallets] = useState<ParentWalletRow[]>([]);
  const [summary, setSummary] = useState<WalletsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [crediting, setCrediting] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/accounts/wallet");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch wallets");
      }

      setWallets(data.wallets);
      setSummary(data.summary);
    } catch (err) {
      console.error(err);
      setError("Unable to load parent wallets.");
    } finally {
      setLoading(false);
    }
  }

  async function credit(parentId: string, amount: number, reason: string) {
    try {
      setCrediting(parentId);

      const res = await fetch("/api/accounts/wallet/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId, amount, reason }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to credit this wallet");
      }

      await load();
      return true;
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to credit this wallet.");
      return false;
    } finally {
      setCrediting(null);
    }
  }

  return { wallets, summary, loading, error, crediting, credit, reload: load };
}
