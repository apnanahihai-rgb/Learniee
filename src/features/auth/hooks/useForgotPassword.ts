"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ForgotPasswordStep = "email" | "otp" | "password" | "success";

export function useForgotPassword() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [step, setStep] = useState<ForgotPasswordStep>("email");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  /** POSTs JSON to one of our own `/api/auth/*` routes; returns an error message or null. */
  async function postAuth(path: string, payload: Record<string, unknown>): Promise<string | null> {
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) return null;

      const data = await res.json().catch(() => ({}));
      return data.error || "Something went wrong. Please try again.";
    } catch {
      return "Network error. Please check your connection and try again.";
    }
  }

  async function handleSendOtp() {
    setError("");
    setSuccessMessage("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    const failure = await postAuth("/api/auth/forgot-password", { email: email.trim() });

    setLoading(false);

    if (failure) {
      setError(failure);
      return;
    }

    setStep("otp");
    setSuccessMessage("A verification code has been sent to your email.");
  }

  function handleVerifyOtp() {
    setError("");
    setSuccessMessage("");

    if (!otp.trim()) {
      setError("Please enter the verification code.");
      return;
    }

    setStep("password");
  }

  async function handleResetPassword() {
    setError("");
    setSuccessMessage("");

    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError(
        "Password must contain at least one uppercase letter."
      );
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setError(
        "Password must contain at least one lowercase letter."
      );
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setError(
        "Password must contain at least one number."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const failure = await postAuth("/api/auth/reset-password", {
      email: email.trim(),
      code: otp.trim(),
      newPassword,
    });

    setLoading(false);

    if (failure) {
      setError(failure);
      return;
    }

    setStep("success");
    setSuccessMessage("Your password has been changed successfully.");
  }

  async function handleResendOtp() {
    setError("");
    setSuccessMessage("");

    setLoading(true);

    const failure = await postAuth("/api/auth/forgot-password", { email: email.trim() });

    setLoading(false);

    if (failure) {
      setError(failure);
      return;
    }

    setSuccessMessage("A new verification code has been sent.");
  }

  function handleBackToLogin() {
    router.push("/login");
  }

  return {
    email,
    otp,
    newPassword,
    confirmPassword,

    step,

    error,
    successMessage,

    loading,

    showPassword,
    showConfirmPassword,

    setEmail,
    setOtp,
    setNewPassword,
    setConfirmPassword,

    setShowPassword,
    setShowConfirmPassword,

    handleSendOtp,
    handleVerifyOtp,
    handleResetPassword,
    handleResendOtp,
    handleBackToLogin,
  };
}