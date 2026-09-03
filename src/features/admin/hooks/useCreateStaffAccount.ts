"use client";

import { useState } from "react";
import type { StaffAccount, StaffRole } from "@/features/admin/types/staffAccount";

export type CreateStaffStep = "details" | "done";

interface CreatedResult {
  account: StaffAccount;
  tempPassword: string;
}

// OTP verification (email + phone) was removed from this flow on 2026-09-03.
// Account creation now happens directly from the details step. Re-add an
// OTP/verification step here (via AWS SES) when that's ready — see
// src/app/api/admin/staff-accounts/send-otp and /verify-otp, which still
// exist but are no longer called.
export function useCreateStaffAccount(onCreated: (account: StaffAccount) => void) {
  const [step, setStep] = useState<CreateStaffStep>("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); // expected in E.164, e.g. +91XXXXXXXXXX
  const [role, setRole] = useState<StaffRole>("HR");

  const [result, setResult] = useState<CreatedResult | null>(null);

  function validateDetails(): string | null {
    if (!firstName.trim() || !lastName.trim()) return "First and last name are required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address.";
    if (!/^\+[1-9]\d{7,14}$/.test(phone.trim()))
      return "Enter a valid phone number in E.164 format, e.g. +91XXXXXXXXXX.";
    return null;
  }

  async function handleCreateAccount() {
    setError("");
    const validationError = validateDetails();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to create account.");

      setResult({ account: body.account, tempPassword: body.tempPassword });
      setStep("done");
      onCreated(body.account);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return {
    step,
    loading,
    error,
    firstName,
    lastName,
    email,
    phone,
    role,
    result,

    setFirstName,
    setLastName,
    setEmail,
    setPhone,
    setRole,

    handleCreateAccount,
  };
}
