"use client";

interface OtpVerificationProps {
  email: string;
  otp: string;
  onOtpChange: (value: string) => void;
  onContinue: () => void;
  onResend: () => void;
  loading: boolean;
  error?: string;
  successMessage?: string;
}

export default function OtpVerification({
  email,
  otp,
  onOtpChange,
  onContinue,
  onResend,
  loading,
  error,
  successMessage,
}: OtpVerificationProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">
          Verify Email
        </h2>

        <p className="text-sm text-gray-500 mt-2">
          Enter the OTP sent to
        </p>

        <p className="text-sm font-medium">
          {email}
        </p>
      </div>

      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        placeholder="Enter OTP"
        value={otp}
        onChange={(e) =>
          onOtpChange(
            e.target.value.replace(/\D/g, "")
          )
        }
        className="border rounded-full p-3 w-full outline-none"
      />

      {error && (
        <p className="text-red-600 text-sm text-center">
          {error}
        </p>
      )}

      {successMessage && (
        <p className="text-green-600 text-sm text-center">
          {successMessage}
        </p>
      )}

      <button
        type="button"
        onClick={onContinue}
        disabled={loading}
        className="w-full rounded-full py-3 text-white font-semibold bg-violet-600 disabled:opacity-60"
      >
        Continue
      </button>

      <button
        type="button"
        onClick={onResend}
        disabled={loading}
        className="w-full text-violet-600 text-sm"
      >
        Resend OTP
      </button>
    </div>
  );
}