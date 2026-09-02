"use client";

import { useState } from "react";
import type { StaffAccount, StaffRole } from "@/features/admin/types/staffAccount";

export type CreateStaffStep = "details" | "verify-email" | "verify-phone" | "done";

interface CreatedResult {
  account: StaffAccount;
  tempPassword: string;
}

export function useCreateStaffAccount(onCreated: (account: StaffAccount) => void) {
  const [step, setStep] = useState<CreateStaffStep>("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); // expected in E.164, e.g. +91XXXXXXXXXX
  const [role, setRole] = useState<StaffRole>("HR");

  const [emailChallengeToken, setEmailChallengeToken] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailVerifiedToken, setEmailVerifiedToken] = useState("");

  const [phoneChallengeToken, setPhoneChallengeToken] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneVerifiedToken, setPhoneVerifiedToken] = useState("");

  const [result, setResult] = useState<CreatedResult | null>(null);

  function validateDetails(): string | null {
    if (!firstName.trim() || !lastName.trim()) return "First and last name are required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address.";
    if (!/^\+[1-9]\d{7,14}$/.test(phone.trim()))
      return "Enter a valid phone number in E.164 format, e.g. +91XXXXXXXXXX.";
    return null;
  }

  async function handleSendEmailOtp() {
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
        body: JSON.stringify({ channel: "email", target: email.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to send email OTP.");

      setEmailChallengeToken(body.challengeToken);
      setStep("verify-email");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyEmailOtp() {
    setError("");
    if (!emailOtp.trim()) {
      setError("Enter the code sent to the email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff-accounts/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken: emailChallengeToken, code: emailOtp.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Invalid code.");

      setEmailVerifiedToken(body.verifiedToken);

      // Now send the phone OTP.
      const phoneRes = await fetch("/api/admin/staff-accounts/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "phone", target: phone.trim() }),
      });
      const phoneBody = await phoneRes.json();
      if (!phoneRes.ok) throw new Error(phoneBody.error || "Failed to send phone OTP.");

      setPhoneChallengeToken(phoneBody.challengeToken);
      setStep("verify-phone");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendEmailOtp() {
    await handleSendEmailOtp();
  }

  async function handleResendPhoneOtp() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff-accounts/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "phone", target: phone.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to send phone OTP.");
      setPhoneChallengeToken(body.challengeToken);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyPhoneOtpAndCreate() {
    setError("");
    if (!phoneOtp.trim()) {
      setError("Enter the code sent to the phone number.");
      return;
    }

    setLoading(true);
    try {
      const verifyRes = await fetch("/api/admin/staff-accounts/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken: phoneChallengeToken, code: phoneOtp.trim() }),
      });
      const verifyBody = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyBody.error || "Invalid code.");

      setPhoneVerifiedToken(verifyBody.verifiedToken);

      const createRes = await fetch("/api/admin/staff-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role,
          emailVerifiedToken,
          phoneVerifiedToken: verifyBody.verifiedToken,
        }),
      });
      const createBody = await createRes.json();
      if (!createRes.ok) throw new Error(createBody.error || "Failed to create account.");

      setResult({ account: createBody.account, tempPassword: createBody.tempPassword });
      setStep("done");
      onCreated(createBody.account);
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
    emailOtp,
    phoneOtp,
    result,

    setFirstName,
    setLastName,
    setEmail,
    setPhone,
    setRole,
    setEmailOtp,
    setPhoneOtp,

    handleSendEmailOtp,
    handleVerifyEmailOtp,
    handleResendEmailOtp,
    handleResendPhoneOtp,
    handleVerifyPhoneOtpAndCreate,
  };
}
