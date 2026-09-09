"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

import { userPool } from "@/lib/cognito";
import ErrorBanner from "./ErrorBanner";

/**
 * Shared between `/parent/settings` and `/teacher/settings`. Changes
 * the password for the currently-logged-in Cognito user directly
 * from the browser (`CognitoUser.changePassword`) — same "talk to
 * Cognito directly, no API route" pattern already used by
 * login/forgot-password (`useLogin.ts`, `useForgotPassword.ts`).
 * Requires the current password, unlike the forgot-password OTP
 * flow, since the user is already authenticated here.
 *
 * `userPool.getCurrentUser()` relies on amazon-cognito-identity-js's
 * own session storage (populated on login by `authenticateUser`),
 * which is separate from the `idToken` cookie the API routes read —
 * if that local session is missing (e.g. cleared storage) this shows
 * a "log in again" message rather than failing silently.
 */
export default function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  function resetFields() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!currentPassword) {
      setError("Enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError("New password must contain an uppercase letter, a lowercase letter, and a number.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      setError("Your session has expired. Please log out and log back in.");
      return;
    }

    setSaving(true);

    cognitoUser.getSession((sessionErr: Error | null) => {
      if (sessionErr) {
        setSaving(false);
        setError("Your session has expired. Please log out and log back in.");
        return;
      }

      cognitoUser.changePassword(currentPassword, newPassword, (changeErr) => {
        setSaving(false);

        if (changeErr) {
          setError(changeErr.message || "Failed to change your password.");
          return;
        }

        resetFields();
        setNotice("Password changed.");
        setTimeout(() => setNotice(""), 3000);
      });
    });
  }

  return (
    <div className="bg-white border rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <Lock size={16} className="text-violet-700" />
        <h2 className="text-sm font-semibold text-gray-800">Change Password</h2>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Update the password you use to log in. You&apos;ll stay logged in on this device.
      </p>

      {error && <ErrorBanner size="compact">{error}</ErrorBanner>}
      {notice && (
        <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg mb-4">{notice}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
        <PasswordField
          label="Current Password"
          name="currentPassword"
          value={currentPassword}
          onChange={setCurrentPassword}
          show={showCurrent}
          onToggleShow={() => setShowCurrent((v) => !v)}
        />
        <PasswordField
          label="New Password"
          name="newPassword"
          value={newPassword}
          onChange={setNewPassword}
          show={showNew}
          onToggleShow={() => setShowNew((v) => !v)}
        />
        <PasswordField
          label="Confirm New Password"
          name="confirmNewPassword"
          value={confirmPassword}
          onChange={setConfirmPassword}
          show={showNew}
        />

        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto inline-flex items-center justify-center bg-violet-700 hover:bg-violet-800 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
        >
          {saving ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}

function PasswordField({
  label,
  name,
  value,
  onChange,
  show,
  onToggleShow,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow?: () => void;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={show ? "text" : "password"}
          value={value}
          autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 pr-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {onToggleShow && (
          <button
            type="button"
            onClick={onToggleShow}
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}
