"use client";

import { useEffect, useState } from "react";

import { openRazorpayCheckout } from "@/lib/loadRazorpayCheckout";
import {
  WALLET_TOPUP_MIN_AMOUNT,
  WALLET_TOPUP_MAX_AMOUNT,
} from "@/features/shared/utils/walletTopup";

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

export { WALLET_TOPUP_MIN_AMOUNT, WALLET_TOPUP_MAX_AMOUNT };

export function useWallet() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransactionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingMoney, setAddingMoney] = useState(false);

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

  /**
   * Full top-up flow: create a Razorpay order for `amount`, open
   * Checkout, verify the result server-side, then reload the
   * balance. Returns a message to show the parent — success or
   * failure — rather than throwing, so callers don't each need
   * their own try/catch for the same three failure modes
   * (validation, payment cancelled, verify failed).
   */
  async function addMoney(amount: number): Promise<{ ok: boolean; message: string }> {
    if (
      !Number.isFinite(amount) ||
      amount < WALLET_TOPUP_MIN_AMOUNT ||
      amount > WALLET_TOPUP_MAX_AMOUNT
    ) {
      const message = `Enter an amount between ₹${WALLET_TOPUP_MIN_AMOUNT} and ₹${WALLET_TOPUP_MAX_AMOUNT}.`;
      setError(message);
      return { ok: false, message };
    }

    setAddingMoney(true);
    setError("");

    try {
      const orderRes = await fetch("/api/parent/wallet/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to start payment.");
      }

      const result = await openRazorpayCheckout({
        orderId: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId: orderData.keyId,
        name: "Learnie Wallet",
        description: `Add ₹${amount.toLocaleString("en-IN")} to wallet`,
      });

      if (!result) {
        return { ok: false, message: "Payment cancelled — no charge was made." };
      }

      const verifyRes = await fetch("/api/parent/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: result.razorpay_order_id,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpaySignature: result.razorpay_signature,
        }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Payment succeeded but your wallet couldn't be updated.");
      }

      await load();

      return { ok: true, message: "Money added to your wallet!" };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add money.";
      setError(message);
      return { ok: false, message };
    } finally {
      setAddingMoney(false);
    }
  }

  return { balance, transactions, loading, error, addingMoney, addMoney, reload: load };
}
