"use client";

import { useCallback, useEffect, useState } from "react";

import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";

/**
 * Just the Parent's current Wallet balance (rupees), for the "Pay with
 * wallet" buttons. `null` until loaded or if it couldn't be read — callers
 * must treat that as "wallet payment not available", never as 0 credit.
 */
export function useWalletBalance() {
  const [balance, setBalance] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/parent/wallet");
      const data = await res.json();

      if (res.ok && typeof data.balance === "number") {
        setBalance(data.balance);
      }
    } catch (err) {
      console.error("Wallet balance load failed:", err);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(() => load(), { paths: ["/api/parent/wallet"] });

  return { balance, reload: load };
}
