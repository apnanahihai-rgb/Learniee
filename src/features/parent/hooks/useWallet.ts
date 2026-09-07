"use client";

import { useEffect, useState } from "react";

export interface WalletTransactionView {
  id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  balanceAfter: number;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
}

export function useWallet() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransactionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/parent/wallet");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch your wallet");
      }

      setBalance(data.balance);
      setTransactions(data.transactions);
    } catch (err) {
      console.error(err);
      setError("Unable to load your wallet.");
    } finally {
      setLoading(false);
    }
  }

  return { balance, transactions, loading, error, reload: load };
}
