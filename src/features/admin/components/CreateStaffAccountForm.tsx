"use client";

import { ADMIN_CARD, ADMIN_CONTROL, adminBtn } from "@/features/admin/components/ui/adminStyles";
import { AdminErrorNote, AdminField } from "@/features/admin/components/ui/design";
import { useCreateStaffAccount } from "@/features/admin/hooks/useCreateStaffAccount";
import type { StaffAccount, StaffRole } from "@/features/admin/types/staffAccount";

interface CreateStaffAccountFormProps {
  onCreated: (account: StaffAccount) => void;
  /** Called after the one-time password has been shown and dismissed. */
  onDone?: (account: StaffAccount) => void;
}

/**
 * "Create staff account" card (design 21). Always visible beside the table.
 * Details -> SMS OTP (Fast2SMS) -> POST /api/admin/staff-accounts creates the Cognito login and the database row;
 * the temporary password is shown once in this card, then the form resets.
 */
export default function CreateStaffAccountForm({ onCreated, onDone }: CreateStaffAccountFormProps) {
  const {
    step,
    loading,
    error,
    firstName,
    lastName,
    email,
    phone,
    role,
    otp,
    result,
    setOtp,
    setFirstName,
    setLastName,
    setEmail,
    setPhone,
    setRole,
    handleSendOtp,
    handleVerifyAndCreate,
    backToDetails,
    reset,
  } = useCreateStaffAccount(onCreated);

  if (step === "done" && result) {
    return (
      <div className={`${ADMIN_CARD} flex flex-col gap-4 p-5`}>
        <h2 className="font-heading text-[19px] font-semibold">Account created</h2>
        <p className="text-pd-ink2">
          {result.account.firstName} {result.account.lastName} ({result.account.email}) can now log in
          with the temporary password below. They will be asked to set a new one on first login.
        </p>
        <div className="select-all break-all rounded-lg bg-pd-bg px-3 py-2.5 font-mono text-[14px] font-semibold">
          {result.tempPassword}
        </div>
        <p className="text-[13px] text-pd-ink3">
          This was also emailed to {result.account.email}. It will not be shown again.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const account = result.account;

              reset();
              onDone?.(account);
            }}
            className={adminBtn("pri")}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <form
        className={`${ADMIN_CARD} flex flex-col gap-4 p-5`}
        onSubmit={(event) => {
          event.preventDefault();
          void handleVerifyAndCreate();
        }}
        noValidate
      >
        <h2 className="font-heading text-[19px] font-semibold">Verify phone number</h2>
        <p className="text-pd-ink2">
          A 6-digit code was sent by SMS to {phone}. It is valid for 10 minutes.
        </p>

        <AdminField id="staff-otp" label="SMS code">
          <input
            id="staff-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            className={ADMIN_CONTROL}
          />
        </AdminField>

        <AdminErrorNote>{error}</AdminErrorNote>

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={loading} className={adminBtn("pri")}>
            {loading ? "Verifying…" : "Verify & create account"}
          </button>
          <button
            type="button"
            onClick={() => void handleSendOtp()}
            disabled={loading}
            className={adminBtn("out")}
          >
            Resend code
          </button>
          <button type="button" onClick={backToDetails} disabled={loading} className={adminBtn("out")}>
            Back
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      className={`${ADMIN_CARD} flex flex-col gap-4 p-5`}
      onSubmit={(event) => {
        event.preventDefault();
        void handleSendOtp();
      }}
      noValidate
    >
      <h2 className="font-heading text-[19px] font-semibold">Create staff account</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField id="staff-first" label="First name">
          <input
            id="staff-first"
            type="text"
            autoComplete="off"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={ADMIN_CONTROL}
          />
        </AdminField>
        <AdminField id="staff-last" label="Last name">
          <input
            id="staff-last"
            type="text"
            autoComplete="off"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={ADMIN_CONTROL}
          />
        </AdminField>
      </div>

      <AdminField id="staff-email" label="Email">
        <input
          id="staff-email"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={ADMIN_CONTROL}
        />
      </AdminField>

      <AdminField id="staff-phone" label="Phone">
        <input
          id="staff-phone"
          type="tel"
          autoComplete="off"
          placeholder="+91XXXXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={ADMIN_CONTROL}
        />
      </AdminField>

      <AdminField id="staff-role" label="Role">
        <select
          id="staff-role"
          value={role}
          onChange={(e) => setRole(e.target.value as StaffRole)}
          className={ADMIN_CONTROL}
        >
          <option value="ACCOUNTS">Accounts</option>
          <option value="HR">HR</option>
          <option value="IT">IT</option>
        </select>
      </AdminField>

      <AdminErrorNote>{error}</AdminErrorNote>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={loading} className={adminBtn("pri")}>
          {loading ? "Sending code…" : "Send OTP"}
        </button>
        <button type="button" onClick={reset} disabled={loading} className={adminBtn("out")}>
          Cancel
        </button>
      </div>
    </form>
  );
}
