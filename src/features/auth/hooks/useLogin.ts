"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { clearLegacyCognitoStorage } from "@/features/auth/utils/clearLegacyCognitoStorage";
import { logClientActivity } from "@/features/shared/utils/logClientActivity";

/**
 * `?next=` support, used by the public class pages ("log in, then request this
 * class"). Same-site /parent/... paths only, so it can't be turned into an open
 * redirect; middleware still enforces the role on whatever page it lands on.
 */
function readSafeParentNext(): string | null {
  if (typeof window === "undefined") return null;

  const next = new URLSearchParams(window.location.search).get("next");

  if (
    !next ||
    !next.startsWith("/parent/") ||
    next.startsWith("//") ||
    next.includes("\\")
  ) {
    return null;
  }

  return next;
}

const KNOWN_ROLES = ["parent", "teacher", "admin", "hr", "accounts", "it"];

export function useLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // True while we check whether the visitor is already logged in (the session
  // cookies outlive the tab), so the form does not flash before the redirect.
  const [checkingSession, setCheckingSession] = useState(true);

  // Set when `/api/auth/login` answers with a NEW_PASSWORD_REQUIRED
  // challenge — this happens on a user's first login after an admin
  // created their account via AdminCreateUser (e.g. Staff Accounts /
  // HR / Accounts / IT), which leaves them in FORCE_CHANGE_PASSWORD
  // status until they set a real password. The challenge itself is held
  // server-side in a short-lived httpOnly cookie.
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    let cancelled = false;

    clearLegacyCognitoStorage();

    async function redirectIfLoggedIn() {
      let loggedIn = false;

      try {
        const res = await fetch("/api/auth/session");

        // Not logged in (or the session could not be renewed): show the form.
        if (!res.ok) return;

        const data = await res.json();

        if (!KNOWN_ROLES.includes(data.role)) return;

        // Redirecting: keep the "checking" screen up so the form never flashes.
        await routeAfterLogin(data.role);
        loggedIn = true;
      } catch {
        // Anything unexpected: fall back to the normal login form.
      } finally {
        if (!cancelled && !loggedIn) setCheckingSession(false);
      }
    }

    redirectIfLoggedIn();

    return () => {
      cancelled = true;
    };
    // Runs once on mount; routeAfterLogin only uses stable setters / router.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function routeForRole(role: unknown) {
    if (role === "hr") {
      router.push("/hr");
      return true;
    }
    if (role === "accounts") {
      router.push("/accounts");
      return true;
    }
    if (role === "it") {
      router.push("/it");
      return true;
    }
    return false;
  }

  /**
   * Where each role goes after a successful login. The auth cookies are
   * already set by the server at this point, so the follow-up fetches
   * below are authenticated.
   */
  async function routeAfterLogin(role: unknown) {
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

      router.push(readSafeParentNext() ?? "/parent");
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
        // Bank Account Approval (Sep 10, 2026) — the very first
        // thing an approved Teacher needs to do is submit payout
        // bank details for Admin's separate approval, so they're
        // ready to be paid once cycles start completing. Only
        // gate on "never submitted" (MISSING) — once they've
        // submitted once, PENDING/APPROVED/REJECTED all mean
        // they've already engaged with the form, so don't force
        // a redirect there on every login; the sidebar link and
        // the page's own status banner cover the rest.
        if (data.bankAccountStatus === "MISSING") {
          router.push("/teacher/bank-account");
          return;
        }

        router.push("/teacher");
        return;
      }

      // -----------------------------
      // ADMIN REJECTED
      // -----------------------------
      // There is no /teacher/rejected page — the pending-approval
      // page shows the rejected state as well.
      if (data.approvalStatus === "REJECTED") {
        router.push("/teacher/pending-approval");
        return;
      }

      throw new Error("Invalid teacher approval status.");
    }

    if (role === "admin") {
      router.push("/admin");
      return;
    }

    if (routeForRole(role)) return;

    // -----------------------------
    // UNKNOWN ROLE
    // -----------------------------
    setError("Invalid user role. Please contact administrator.");
    setLoading(false);
  }

  async function handleCompleteNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError("Password must contain an uppercase letter, a lowercase letter, and a number.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/new-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // The challenge cookie only lives a few minutes.
        if (res.status === 401) setForcePasswordChange(false);
        setError(data.error || "Could not set your new password.");
        setLoading(false);
        return;
      }

      logClientActivity("LOGIN");
      setForcePasswordChange(false);
      setLoading(false);

      if (data.role === "admin") {
        router.push("/admin");
        return;
      }
      if (routeForRole(data.role)) return;

      // Parent/teacher accounts don't currently go through
      // AdminCreateUser, but handle it gracefully if that changes.
      router.push("/login");
    } catch (err) {
      console.error(err);
      setLoading(false);
      setError("Password changed, but something went wrong loading your account.");
    }
  }

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

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Login failed. Please try again.");
        setLoading(false);
        return;
      }

      // Fired for users created via AdminCreateUser (FORCE_CHANGE_PASSWORD
      // status) who haven't set their own password yet.
      if (data.challenge === "NEW_PASSWORD_REQUIRED") {
        setLoading(false);
        setForcePasswordChange(true);
        return;
      }

      logClientActivity("LOGIN");

      await routeAfterLogin(data.role);
    } catch (err) {
      console.error(err);

      setError("Login successful, but something went wrong while loading your account.");

      setLoading(false);
    }
  }

  return {
    email,
    password,
    error,
    loading,
    checkingSession,
    showPassword,

    forcePasswordChange,
    newPassword,
    confirmNewPassword,

    setShowPassword,
    setEmail,
    setPassword,
    setNewPassword,
    setConfirmNewPassword,

    handleLogin,
    handleCompleteNewPassword,
  };
}
