"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CognitoUser, CognitoUserAttribute } from "amazon-cognito-identity-js";

import { userPool } from "@/lib/cognito";
import { SignupFormData, SignupFormErrors } from "@/types/signup";
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

    if (!form.acceptedTerms) {
      next.acceptedTerms = "You must accept the Terms & Conditions";
    }

    return next;
  }

  function handleSendOtp() {
    setSubmitError("");
    setOtpError("");
    const fullPhone = `+91${form.phone.trim()}`;
    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSendingOtp(true);

    const attributes = [
      new CognitoUserAttribute({
        Name: "given_name",
        Value: form.firstName.trim(),
      }),

      new CognitoUserAttribute({
        Name: "family_name",
        Value: form.lastName.trim(),
      }),

      new CognitoUserAttribute({
        Name: "phone_number",
        Value: form.phone,
      }),

      new CognitoUserAttribute({
        Name: "custom:role",
        Value: form.role,
      }),
    ];

    userPool.signUp(form.email.trim(), form.password, attributes, [], (err) => {
      setSendingOtp(false);

      if (err) {
        setSubmitError(err.message);
        return;
      }

      setOtpSent(true);
    });
  }

  function handleResendOtp() {
    setOtpError("");
    setSendingOtp(true);

    const cognitoUser = new CognitoUser({
      Username: form.email.trim(),
      Pool: userPool,
    });

    cognitoUser.resendConfirmationCode((err) => {
      setSendingOtp(false);

      if (err) {
        setOtpError(err.message);
      }
    });
  }

  function handleVerifyOtp() {
    setOtpError("");

    if (!form.otp.trim()) {
      setOtpError("Enter the code sent to your email");
      return;
    }

    setVerifying(true);

    const cognitoUser = new CognitoUser({
      Username: form.email.trim(),
      Pool: userPool,
    });

    cognitoUser.confirmRegistration(form.otp.trim(), true, (err) => {
      setVerifying(false);

      if (err) {
        setOtpError(err.message);
        return;
      }

      setVerified(true);
    });
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
