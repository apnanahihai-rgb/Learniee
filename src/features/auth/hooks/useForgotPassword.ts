"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CognitoUser } from "amazon-cognito-identity-js";

import { userPool } from "@/lib/cognito";

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

  function handleSendOtp() {
    setError("");
    setSuccessMessage("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    const cognitoUser = new CognitoUser({
      Username: email.trim(),
      Pool: userPool,
    });

    cognitoUser.forgotPassword({
      onSuccess: () => {
        setLoading(false);

        setStep("otp");

        setSuccessMessage(
          "A verification code has been sent to your email."
        );
      },

      onFailure: (err) => {
        setLoading(false);
        setError(err.message);
      },

      inputVerificationCode: () => {
        setLoading(false);

        setStep("otp");

        setSuccessMessage(
          "A verification code has been sent to your email."
        );
      },
    });
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

  function handleResetPassword() {
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

    const cognitoUser = new CognitoUser({
      Username: email.trim(),
      Pool: userPool,
    });

    cognitoUser.confirmPassword(
      otp.trim(),
      newPassword,
      {
        onSuccess: () => {
          setLoading(false);

          setStep("success");

          setSuccessMessage(
            "Your password has been changed successfully."
          );
        },

        onFailure: (err) => {
          setLoading(false);
          setError(err.message);
        },
      }
    );
  }

  function handleResendOtp() {
    setError("");
    setSuccessMessage("");

    setLoading(true);

    const cognitoUser = new CognitoUser({
      Username: email.trim(),
      Pool: userPool,
    });

    cognitoUser.forgotPassword({
      onSuccess: () => {
        setLoading(false);

        setSuccessMessage(
          "A new verification code has been sent."
        );
      },

      onFailure: (err) => {
        setLoading(false);
        setError(err.message);
      },

      inputVerificationCode: () => {
        setLoading(false);

        setSuccessMessage(
          "A new verification code has been sent."
        );
      },
    });
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