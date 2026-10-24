"use client";

import {
  GST_RATE_PCT,
  gstOn,
  upiFeeOn,
  type PaymentMethodChoice,
} from "@/lib/transactionCharges";

/**
 * Asks the parent how they'll pay BEFORE the Razorpay order is created —
 * UPI adds a transaction charge, so the order amount depends on the answer.
 * Resolves with the choice, or `null` if they cancel.
 *
 * Shows ONE combined "GST & transaction charges" line that expands to the
 * two parts only when the parent taps it. `baseAmount` is the price being
 * paid by card/UPI (after any wallet part); an international card surcharge,
 * if it applies, is added by the server and shown in the payment window.
 *
 * Plain DOM (no React tree) so every checkout hook can `await` it with one line.
 */
export function askPaymentMethod(options: {
  baseAmount: number;
}): Promise<PaymentMethodChoice | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve("OTHER");
      return;
    }

    const base = Math.max(0, Math.round(options.baseAmount * 100) / 100);
    const gst = gstOn(base);
    const beforeFee = Math.round((base + gst) * 100) / 100;
    const upiFee = upiFeeOn(beforeFee);
    const inr = (n: number) =>
      `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

    let method: PaymentMethodChoice = "OTHER";
    let expanded = false;

    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit;";

    const card = document.createElement("div");
    card.style.cssText =
      "background:#fff;color:#111;border-radius:16px;max-width:380px;width:100%;padding:20px;box-shadow:0 10px 40px rgba(0,0,0,.25);";
    overlay.appendChild(card);

    const close = (value: PaymentMethodChoice | null) => {
      overlay.remove();
      resolve(value);
    };

    function render() {
      const fee = method === "UPI" ? upiFee : 0;
      const charges = Math.round((gst + fee) * 100) / 100;
      const total = Math.round((beforeFee + fee) * 100) / 100;

      const row = (label: string, value: string, opts = "") =>
        `<div style="display:flex;justify-content:space-between;gap:12px;${opts}"><span>${label}</span><span>${value}</span></div>`;

      const option = (value: PaymentMethodChoice, title: string, hint: string) =>
        `<label style="display:flex;gap:10px;align-items:flex-start;padding:10px;border:1px solid ${
          method === value ? "#9347FF" : "#ddd"
        };border-radius:10px;cursor:pointer;margin-top:8px;">
          <input type="radio" name="pm" value="${value}" ${method === value ? "checked" : ""} style="margin-top:3px;" />
          <span><strong style="font-size:14px;">${title}</strong>${hint ? `<br/><span style="font-size:12px;color:#666;">${hint}</span>` : ""}</span>
        </label>`;

      card.innerHTML = `
        <h3 style="margin:0 0 4px;font-size:17px;font-weight:600;">How would you like to pay?</h3>
        <p style="margin:0 0 8px;font-size:12px;color:#666;">Choose a method — the total updates below.</p>
        ${option("UPI", "UPI", "")}
        ${option("OTHER", "Card, netbanking & others", "No transaction charge")}
        <div style="margin-top:14px;font-size:14px;display:grid;gap:6px;">
          ${row("Amount", inr(base))}
          <button type="button" data-toggle style="all:unset;cursor:pointer;display:flex;justify-content:space-between;gap:12px;">
            <span>GST &amp; transaction charges <span style="font-size:11px;color:#9347FF;">${expanded ? "▲ hide" : "▼ details"}</span></span>
            <span>${inr(charges)}</span>
          </button>
          ${
            expanded
              ? `<div style="padding-left:12px;font-size:12px;color:#555;display:grid;gap:4px;">
                  ${row(`GST charges (${GST_RATE_PCT}%)`, inr(gst))}
                  ${row("Transaction charges (UPI)", inr(fee))}
                </div>`
              : ""
          }
          ${row("Total", inr(total), "border-top:1px solid #eee;padding-top:8px;font-weight:600;")}
        </div>
        <p style="margin:8px 0 0;font-size:11px;color:#888;">International card fee, if it applies to your account, is added in the payment window.</p>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button type="button" data-cancel style="flex:1;padding:10px;border-radius:10px;border:1px solid #ddd;background:#fff;cursor:pointer;">Cancel</button>
          <button type="button" data-continue style="flex:1;padding:10px;border-radius:10px;border:0;background:#9347FF;color:#fff;font-weight:600;cursor:pointer;">Continue</button>
        </div>`;

      card.querySelectorAll<HTMLInputElement>('input[name="pm"]').forEach((input) => {
        input.addEventListener("change", () => {
          method = input.value === "UPI" ? "UPI" : "OTHER";
          render();
        });
      });
      card.querySelector("[data-toggle]")?.addEventListener("click", () => {
        expanded = !expanded;
        render();
      });
      card.querySelector("[data-cancel]")?.addEventListener("click", () => close(null));
      card.querySelector("[data-continue]")?.addEventListener("click", () => close(method));
    }

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close(null);
    });

    render();
    document.body.appendChild(overlay);
  });
}
