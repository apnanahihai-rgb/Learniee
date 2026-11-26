"use client";

import { useState } from "react";
import {
  buildE164,
  DEFAULT_PHONE_COUNTRY_CODE,
} from "@/features/shared/utils/phoneCountryCodes";
import type { StaffAccount, StaffRole } from "@/features/admin/types/staffAccount";

export type CreateStaffStep = "details" | "otp" | "done";

interface CreatedResult {
  account: StaffAccount;
  tempPassword: string;
}

// Flow: details -> SMS OTP (Fast2SMS) sent to the staff phone -> admin enters
// the code -> account is created with the verified token.
export function useCreateStaffAccount(onCreated: (account: StaffAccount) => void) {
  const [step, setStep] = useState<CreateStaffStep>("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState(DEFAULT_PHONE_COUNTRY_CODE);
  const [phoneLocal, setPhoneLocal] = useState(""); // number without the country code
  const phone = buildE164(phoneCode, phoneLocal); // E.164, e.g. +91XXXXXXXXXX
  const [role, setRole] = useState<StaffRole>("ACCOUNTS");

  const [challengeToken, setChallengeToken] = useState("");
  const [otp, setOtp] = useState("");

  const [result, setResult] = useState<CreatedResult | null>(null);

  function validateDetails(): string | null {
    if (!firstName.trim() || !lastName.trim()) return "First and last name are required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address.";
    if (!/^\+[1-9]\d{7,14}$/.test(phone))
      return "Enter a valid phone number (digits only, without the country code).";
    return null;
  }

  /** Step 1: validate details and send the SMS OTP. Also used for "Resend". */
  async function handleSendOtp() {
    setError("");
    const validationError = validateDetails();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff-accounts/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "phone", target: phone }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to send OTP.");

      setChallengeToken(body.challengeToken);
      setOtp("");
      setStep("otp");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  /** Step 2: verify the code, then create the account. */
  async function handleVerifyAndCreate() {
    setError("");
    if (!/^\d{6}$/.test(otp.trim())) {
      setError("Enter the 6-digit code sent to the phone.");
      return;
    }

    setLoading(true);
    try {
      const verifyRes = await fetch("/api/admin/staff-accounts/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken, code: otp.trim() }),
      });
      const verifyBody = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok) throw new Error(verifyBody.error || "Incorrect code.");

      const res = await fetch("/api/admin/staff-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone,
          role,
          phoneVerifiedToken: verifyBody.verifiedToken,
        }),
      });
      const body = await res.json().catch(() => ({}));
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

  /** Back from the OTP step to edit the details. */
  function backToDetails() {
    setError("");
    setOtp("");
    setStep("details");
  }

  /** Clears the form and goes back to the details step (design: Cancel / Done). */
  function reset() {
    setStep("details");
    setError("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhoneCode(DEFAULT_PHONE_COUNTRY_CODE);
    setPhoneLocal("");
    setRole("ACCOUNTS");
    setChallengeToken("");
    setOtp("");
    setResult(null);
  }

  return {
    step,
    loading,
    error,
    firstName,
    lastName,
    email,
    phone,
    phoneCode,
    phoneLocal,
    role,
    otp,
    result,

    setOtp,
    setFirstName,
    setLastName,
    setEmail,
    setPhoneCode,
    setPhoneLocal,
    setRole,

    handleSendOtp,
    handleVerifyAndCreate,
    backToDetails,
    reset,
  };
}
