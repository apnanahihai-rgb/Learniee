import { Input } from "@/components/ui/input";

const PRIMARY = "#7E2BF1";

interface OtpVerificationProps {
  email: string;
  otp: string;
  otpError: string;
  verifying: boolean;
  sendingOtp: boolean;
  verified: boolean;
  onOtpChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  onVerify: () => void;
  onResend: () => void;
}

export default function OtpVerification({
  email,
  otp,
  otpError,
  verifying,
  sendingOtp,
  verified,
  onOtpChange,
  onVerify,
  onResend,
}: OtpVerificationProps) {
  if (verified) {
    return (
      <div className="space-y-2 pt-1">
        <p className="text-sm text-green-600 text-center">
          Email verified successfully.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-1">
      <p className="text-xs text-gray-500 ml-1">
        We emailed a verification code to {email}
      </p>

      <Input
        placeholder="Enter OTP"
        value={otp}
        onChange={onOtpChange}
        className="rounded-full"
      />

      {otpError && (
        <p className="text-xs text-red-600 ml-3">
          {otpError}
        </p>
      )}

      <button
        type="button"
        onClick={onVerify}
        disabled={verifying}
        className="w-full rounded-full py-3 text-white font-semibold disabled:opacity-60"
        style={{ backgroundColor: PRIMARY }}
      >
        {verifying ? "Verifying..." : "Verify OTP"}
      </button>

      <button
        type="button"
        onClick={onResend}
        disabled={sendingOtp}
        className="w-full text-xs font-medium disabled:opacity-50"
        style={{ color: PRIMARY }}
      >
        {sendingOtp ? "Resending..." : "Resend OTP"}
      </button>
    </div>
  );
}