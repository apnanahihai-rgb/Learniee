"use client";

import { useForgotPassword } from "@/features/auth/hooks/useForgotPassword";

import OtpVerification from "./OtpVerification";
import NewPasswordForm from "./NewPasswordForm";

const PRIMARY = "#7E2BF1";

export default function ForgotPasswordForm() {
  const {
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
  } = useForgotPassword();

  return (
    <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl p-8">
      {/* STEP 1 */}
      {step === "email" && (
        <div className="space-y-5">
          <div className="text-center">
            <h1
              className="text-2xl font-bold"
              style={{ color: PRIMARY }}
            >
              Forgot Password?
            </h1>

            <p className="text-sm text-gray-500 mt-2">
              Enter your email and we'll send you a
              verification code.
            </p>
          </div>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className="border rounded-full p-3 w-full outline-none"
          />

          {error && (
            <p className="text-red-600 text-sm text-center">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSendOtp}
            disabled={loading}
            className="w-full rounded-full py-3 text-white font-semibold disabled:opacity-60"
            style={{
              backgroundColor: PRIMARY,
            }}
          >
            {loading
              ? "Sending OTP..."
              : "Send OTP"}
          </button>

          <button
            type="button"
            onClick={handleBackToLogin}
            className="w-full text-sm text-violet-600"
          >
            Back to Login
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === "otp" && (
        <OtpVerification
          email={email}
          otp={otp}
          onOtpChange={setOtp}
          onContinue={handleVerifyOtp}
          onResend={handleResendOtp}
          loading={loading}
          error={error}
          successMessage={successMessage}
        />
      )}

      {/* STEP 3 */}
      {step === "password" && (
        <NewPasswordForm
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          onNewPasswordChange={setNewPassword}
          onConfirmPasswordChange={
            setConfirmPassword
          }
          onSubmit={handleResetPassword}
          showPassword={showPassword}
          showConfirmPassword={
            showConfirmPassword
          }
          onTogglePassword={() =>
            setShowPassword(
              (value) => !value
            )
          }
          onToggleConfirmPassword={() =>
            setShowConfirmPassword(
              (value) => !value
            )
          }
          loading={loading}
          error={error}
        />
      )}

      {/* STEP 4 */}
      {step === "success" && (
        <div className="text-center space-y-5">
          <div>
            <h2
              className="text-2xl font-bold"
              style={{ color: PRIMARY }}
            >
              Password Changed!
            </h2>

            <p className="text-gray-500 mt-2">
              Your password has been updated
              successfully.
            </p>
          </div>

          <button
            type="button"
            onClick={handleBackToLogin}
            className="w-full rounded-full py-3 text-white font-semibold"
            style={{
              backgroundColor: PRIMARY,
            }}
          >
            Go to Login
          </button>
        </div>
      )}
    </div>
  );
}