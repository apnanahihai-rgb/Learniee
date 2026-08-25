"use client";

import SignupInput from "./SignupInput";
import PasswordInput from "./PasswordInput";
import TermsCheckbox from "./TermsCheckbox";
import TeacherConfirmationCheckbox from "./TeacherConfirmationCheckbox";
import OtpVerification from "./OtpVerification";
import RoleSelector from "./RoleSelector";
import { useSignup } from "@/features/auth/hooks/useSignup";
import PhoneInput from "@/features/auth/components/signup/PhoneInput";
const PRIMARY = "#7E2BF1";

export default function SignupForm() {
  const {
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
  } = useSignup();

  return (
    <div className="w-full md:w-1/2 bg-white rounded-[32px] shadow-2xl p-8 md:-ml-8 z-10">
     <h1
  className="text-xl font-bold text-center mb-6"
  style={{ color: PRIMARY }}
>
  {form.role === "parent"
    ? "Parent Sign up"
    : "Teacher Sign up"}
</h1>

      <form
        onSubmit={handleContinueToLogin}
        className="space-y-3"
        noValidate
      >
        <RoleSelector
  role={form.role}
  onChange={(role) => updateField("role", role)}
  disabled={otpSent}
/>
        <SignupInput
          placeholder="First name"
          value={form.firstName}
          onChange={(e) =>
            updateField("firstName", e.target.value)
          }
          disabled={otpSent}
          error={errors.firstName}
        />

        <SignupInput
          placeholder="Last name"
          value={form.lastName}
          onChange={(e) =>
            updateField("lastName", e.target.value)
          }
          disabled={otpSent}
          error={errors.lastName}
        />

        <SignupInput
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) =>
            updateField("email", e.target.value)
          }
          disabled={otpSent}
          error={errors.email}
        />

        <PhoneInput
  value={form.phone}
  onChange={(value) => updateField("phone", value)}
  error={errors.phone}
/>
        <PasswordInput
          placeholder="Password"
          value={form.password}
          onChange={(e) =>
            updateField("password", e.target.value)
          }
          showPassword={showPassword}
          onToggle={() =>
            setShowPassword((value) => !value)
          }
          disabled={otpSent}
          error={errors.password}
        />

        <PasswordInput
          placeholder="Confirm Password"
          value={form.confirmPassword}
          onChange={(e) =>
            updateField(
              "confirmPassword",
              e.target.value
            )
          }
          showPassword={showConfirmPassword}
          onToggle={() =>
            setShowConfirmPassword((value) => !value)
          }
          disabled={otpSent}
          error={errors.confirmPassword}
        />

        {form.role === "teacher" && (
          <TeacherConfirmationCheckbox
            checked={form.confirmedTeacherRole}
            onChange={(value) =>
              updateField("confirmedTeacherRole", value)
            }
            disabled={otpSent}
            error={errors.confirmedTeacherRole}
          />
        )}

        <TermsCheckbox
          checked={form.acceptedTerms}
          onChange={(value) =>
            updateField("acceptedTerms", value)
          }
          disabled={otpSent}
          error={errors.acceptedTerms}
        />

        {submitError && (
          <p className="text-sm text-red-600 text-center">
            {submitError}
          </p>
        )}

        {!otpSent && (
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={sendingOtp}
            className="w-full rounded-full py-3 text-white font-semibold mt-2 disabled:opacity-60"
            style={{
              backgroundColor: PRIMARY,
            }}
          >
            {sendingOtp ? "Sending..." : "Send OTP"}
          </button>
        )}

        {otpSent && (
          <OtpVerification
            email={form.email}
            otp={form.otp}
            otpError={otpError}
            verifying={verifying}
            sendingOtp={sendingOtp}
            verified={verified}
            onOtpChange={(e) =>
              updateField("otp", e.target.value)
            }
            onVerify={handleVerifyOtp}
            onResend={handleResendOtp}
          />
        )}

        {verified && (
          <button
            type="submit"
            className="w-full rounded-full py-3 text-white font-semibold"
            style={{
              backgroundColor: PRIMARY,
            }}
          >
            Continue to Login
          </button>
        )}
      </form>
    </div>
  );
}