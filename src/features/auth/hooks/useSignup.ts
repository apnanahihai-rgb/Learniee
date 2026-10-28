"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SignupFormData, SignupFormErrors } from "@/features/auth/types/signup";
import { isValidPhoneNumber } from "react-phone-number-input";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useSignup() {
  const router = useRouter();

  const [form, setForm] = useState<SignupFormData>({
    role: "parent",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    otp: "",
    password: "",
    confirmPassword: "",
    confirmedTeacherRole: false,
    acceptedTerms: false,
  });
  const [errors, setErrors] = useState<SignupFormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [otpError, setOtpError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  function updateField<K extends keyof SignupFormData>(
    key: K,
    value: SignupFormData[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [key]: undefined,
    }));
  }

  function validateForm(): SignupFormErrors {
    const next: SignupFormErrors = {};

    if (!form.firstName.trim()) {
      next.firstName = "First name is required";
    }

    if (!form.lastName.trim()) {
      next.lastName = "Last name is required";
    }

    if (!form.email.trim()) {
      next.email = "Email is required";
    } else if (!EMAIL_REGEX.test(form.email.trim())) {
      next.email = "Enter a valid email address";
    }

    if (!form.phone.trim()) {
      next.phone = "Phone is required";
    } else if (!isValidPhoneNumber(form.phone)) {
      next.phone = "Enter a valid phone number";
    }

    if (!form.password) {
      next.password = "Password is required";
    } else if (form.password.length < 8) {
      next.password = "Must be at least 8 characters";
    } else if (!/[A-Z]/.test(form.password)) {
      next.password = "Must include an uppercase letter";
    } else if (!/[a-z]/.test(form.password)) {
      next.password = "Must include a lowercase letter";
    } else if (!/[0-9]/.test(form.password)) {
      next.password = "Must include a number";
    }

    if (!form.confirmPassword) {
      next.confirmPassword = "Please confirm your password";
    } else if (form.confirmPassword !== form.password) {
      next.confirmPassword = "Passwords do not match";
    }

    if (form.role === "teacher" && !form.confirmedTeacherRole) {
      next.confirmedTeacherRole =
        "Please confirm you are signing up as a teacher";
    }

    if (!form.acceptedTerms) {
      next.acceptedTerms = "You must accept the Terms & Conditions";
    }

    return next;
  }

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
    setSubmitError("");
    setOtpError("");
    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSendingOtp(true);

    const error = await postAuth("/api/auth/signup", {
      email: form.email.trim(),
      password: form.password,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone,
      role: form.role,
    });

    setSendingOtp(false);

    if (error) {
      setSubmitError(error);
      return;
    }

    setOtpSent(true);
  }

  async function handleResendOtp() {
    setOtpError("");
    setSendingOtp(true);

    const error = await postAuth("/api/auth/resend-code", { email: form.email.trim() });

    setSendingOtp(false);

    if (error) {
      setOtpError(error);
    }
  }

  async function handleVerifyOtp() {
    setOtpError("");

    if (!form.otp.trim()) {
      setOtpError("Enter the code sent to your email");
      return;
    }

    setVerifying(true);

    const error = await postAuth("/api/auth/confirm", {
      email: form.email.trim(),
      code: form.otp.trim(),
    });

    setVerifying(false);

    if (error) {
      setOtpError(error);
      return;
    }

    setVerified(true);
  }

  function handleContinueToLogin(e: React.FormEvent) {
    e.preventDefault();
    router.push("/login");
  }

  return {
    form,
    errors,

    submitError,
    otpError,

    showPassword,
    showConfirmPassword,

    otpSent,
    sendingOtp,
    verifying,
    verified,

    updateField,
    handleSendOtp,
    handleResendOtp,
    handleVerifyOtp,
    handleContinueToLogin,

    setShowPassword,
    setShowConfirmPassword,
  };
}
