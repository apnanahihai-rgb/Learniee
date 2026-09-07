"use client";

/**
 * Minimal typing for the pieces of `window.Razorpay` this app
 * actually uses — the full Checkout API surface is much bigger.
 */
export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayCheckoutInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let loadPromise: Promise<boolean> | null = null;

/**
 * Loads Razorpay's Checkout script exactly once per page load and
 * resolves `true` once `window.Razorpay` is available. Safe to call
 * from multiple components — subsequent calls reuse the same
 * in-flight/completed load.
 */
export function loadRazorpayCheckout(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${CHECKOUT_SRC}"]`);

    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return loadPromise;
}

export type RazorpayCheckoutResult = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

/**
 * Shared version of the `openRazorpayCheckout` helper that was
 * originally written inline inside `BookingPanel.tsx` for Demo/
 * Enrollment payments. Extracted here (added Sep 7, 2026, for the
 * Wallet top-up flow) rather than duplicated a second time — safe to
 * point BookingPanel at this one too in a future pass, left as-is
 * for now to keep this change scoped to Wallet.
 *
 * Loads Checkout, opens it against a server-created order, and
 * resolves with the payment result once the user completes (or
 * `null` if they abandon) it.
 */
export function openRazorpayCheckout(options: {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  name: string;
  description: string;
}): Promise<RazorpayCheckoutResult | null> {
  return new Promise((resolve, reject) => {
    loadRazorpayCheckout().then((loaded) => {
      if (!loaded || !window.Razorpay) {
        reject(
          new Error(
            "Couldn't load the payment window. Check your connection and try again.",
          ),
        );
        return;
      }

      const checkoutOptions: RazorpayCheckoutOptions = {
        key: options.keyId,
        amount: options.amount,
        currency: options.currency,
        order_id: options.orderId,
        name: options.name,
        description: options.description,
        theme: { color: "#9347FF" },
        handler: (response) => resolve(response),
        modal: {
          ondismiss: () => resolve(null),
        },
      };

      const instance = new window.Razorpay!(checkoutOptions);
      instance.open();
    });
  });
}
