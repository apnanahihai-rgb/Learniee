"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthenticationDetails, CognitoUser } from "amazon-cognito-identity-js";
import Cookies from "js-cookie";

import { userPool } from "@/lib/cognito";

export function useLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    setLoading(true);

    const user = new CognitoUser({
      Username: email.trim(),
      Pool: userPool,
    });

    const authDetails = new AuthenticationDetails({
      Username: email.trim(),
      Password: password,
    });

    user.authenticateUser(authDetails, {
      onSuccess: async (session) => {
        try {
          const idToken = session.getIdToken().getJwtToken();

          Cookies.set("idToken", idToken, {
            expires: 1,
          });

          const role = session.getIdToken().payload["custom:role"];

          // -----------------------------
          // PARENT LOGIN
          // -----------------------------
          if (role === "parent") {
            const res = await fetch("/api/onboarding/status");

            if (!res.ok) {
              throw new Error("Unable to check parent onboarding status.");
            }

            const data = await res.json();

            if (!data.onboardingComplete) {
              router.push("/parent/onboarding/step1");
              return;
            }

            router.push("/parent");
            return;
          }

          // -----------------------------
          // TEACHER LOGIN
          // -----------------------------
          if (role === "teacher") {
            const res = await fetch("/api/teacher/onboarding/status");

            if (!res.ok) {
              throw new Error("Unable to check teacher onboarding status.");
            }

            const data = await res.json();

            // -----------------------------
            // ONBOARDING NOT COMPLETE
            // -----------------------------
            if (!data.onboardingComplete) {
              router.push("/teacher/onboarding/step1");
              return;
            }

            // -----------------------------
            // WAITING FOR ADMIN
            // -----------------------------
            if (data.approvalStatus === "PENDING") {
              router.push("/teacher/pending-approval");
              return;
            }

            // -----------------------------
            // ADMIN APPROVED
            // -----------------------------
            if (data.approvalStatus === "APPROVED") {
              router.push("/teacher");
              return;
            }

            // -----------------------------
            // ADMIN REJECTED
            // -----------------------------
            if (data.approvalStatus === "REJECTED") {
              router.push("/teacher/rejected");
              return;
            }

            throw new Error("Invalid teacher approval status.");
          }

          if (role === "admin") {
            router.push("/admin");
            return;
          }

          // -----------------------------
          // UNKNOWN ROLE
          // -----------------------------
          setError("Invalid user role. Please contact administrator.");

          setLoading(false);
        } catch (err) {
          console.error(err);

          setError(
            "Login successful, but something went wrong while loading your account.",
          );

          setLoading(false);
        }
      },

      onFailure: (err) => {
        setLoading(false);
        setError(err.message);
      },
    });
  }

  return {
    email,
    password,
    error,
    loading,
    showPassword,

    setShowPassword,
    setEmail,
    setPassword,

    handleLogin,
  };
}
