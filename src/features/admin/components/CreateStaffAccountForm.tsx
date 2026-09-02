"use client";

import { useCreateStaffAccount } from "@/features/admin/hooks/useCreateStaffAccount";
import type { StaffAccount } from "@/features/admin/types/staffAccount";

interface CreateStaffAccountFormProps {
  onCreated: (account: StaffAccount) => void;
  onCancel: () => void;
}

export default function CreateStaffAccountForm({ onCreated, onCancel }: CreateStaffAccountFormProps) {
  const {
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
  } = useCreateStaffAccount(onCreated);

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 mb-6 max-w-lg">
      {step === "details" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Create Staff Account</h3>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="border rounded-lg p-2 w-full outline-none"
            />
            <input
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="border rounded-lg p-2 w-full outline-none"
            />
          </div>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded-lg p-2 w-full outline-none"
          />

          <input
            type="tel"
            placeholder="Phone (+91XXXXXXXXXX)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="border rounded-lg p-2 w-full outline-none"
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "HR" | "ACCOUNTS")}
            className="border rounded-lg p-2 w-full outline-none"
          >
            <option value="HR">HR</option>
            <option value="ACCOUNTS">Accounts</option>
          </select>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSendEmailOtp}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send Email OTP"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-500 px-5 py-2 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === "verify-email" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Verify Email</h3>
          <p className="text-sm text-gray-500">Enter the code sent to {email}.</p>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter OTP"
            value={emailOtp}
            onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
            className="border rounded-lg p-2 w-full outline-none"
          />

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleVerifyEmailOtp}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg disabled:opacity-60"
            >
              {loading ? "Verifying…" : "Verify & Continue"}
            </button>
            <button
              type="button"
              onClick={handleResendEmailOtp}
              disabled={loading}
              className="text-purple-600 px-5 py-2 rounded-lg hover:bg-purple-50"
            >
              Resend
            </button>
          </div>
        </div>
      )}

      {step === "verify-phone" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Verify Phone</h3>
          <p className="text-sm text-gray-500">Enter the code sent to {phone}.</p>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter OTP"
            value={phoneOtp}
            onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ""))}
            className="border rounded-lg p-2 w-full outline-none"
          />

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleVerifyPhoneOtpAndCreate}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Verify & Create Account"}
            </button>
            <button
              type="button"
              onClick={handleResendPhoneOtp}
              disabled={loading}
              className="text-purple-600 px-5 py-2 rounded-lg hover:bg-purple-50"
            >
              Resend
            </button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-green-700">Account Created</h3>
          <p className="text-sm text-gray-600">
            {result.account.firstName} {result.account.lastName} ({result.account.email}) can now log
            in with the temporary password below. They&apos;ll be asked to set a new password on
            first login.
          </p>
          <div className="bg-gray-50 border rounded-lg p-3 font-mono text-sm select-all">
            {result.tempPassword}
          </div>
          <p className="text-xs text-gray-400">
            This was also emailed to {result.account.email}. It won&apos;t be shown again.
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
