"use client";

import { useState } from "react";

import { ADMIN_CONTROL, adminBtn, cx } from "@/features/admin/components/ui/adminStyles";
import { AdminErrorNote, AdminField } from "@/features/admin/components/ui/design";
import PdDialog from "@/features/shared/components/PdDialog";
import type {
  AccountAccessUpdateInput,
  ManagedAccount,
} from "@/features/shared/hooks/useAccountAccess";

/** Resolve with an error message to keep the dialog open, or null when saved. */
type Submit = (input: AccountAccessUpdateInput) => Promise<string | null>;

interface DialogProps {
  account: ManagedAccount;
  onCancel: () => void;
  onSubmit: Submit;
}

const accountName = (a: ManagedAccount) => `${a.firstName} ${a.lastName}`.trim() || a.email;

/** Radio row from the design's `.opt`. */
function OptionRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: string;
}) {
  return (
    <label
      className={cx(
        "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 font-semibold",
        checked ? "border-pd-brand bg-pd-b50" : "border-pd-line",
      )}
    >
      <input
        type="radio"
        name="aa-password-mode"
        checked={checked}
        onChange={onChange}
        className="size-[18px] accent-pd-brand"
      />
      {children}
    </label>
  );
}

/**
 * "Reset password" dialog (design 22). Sets a new Cognito password for the
 * login: temporary (must be changed at next sign-in) or permanent. The user is
 * notified and the action is logged by the server (`accountAccess.service.ts`).
 * Mount it only while open.
 */
export function ResetPasswordDialog({ account, onCancel, onSubmit }: DialogProps) {
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"temporary" | "permanent">("temporary");
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (password.length < 8) {
      setInvalid(true);
      document.getElementById("aa-password")?.focus();

      return;
    }

    setBusy(true);
    setError("");

    const message = await onSubmit({
      newPassword: password,
      passwordPermanent: mode === "permanent",
    });

    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  return (
    <PdDialog
      title="Reset password"
      onClose={busy ? () => {} : onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} disabled={busy} className={adminBtn("sec")}>
            Cancel
          </button>
          <button type="button" onClick={() => void save()} disabled={busy} className={adminBtn("pri")}>
            {busy ? "Saving…" : "Reset password"}
          </button>
        </>
      }
    >
      <p>
        Reset the login password for {accountName(account)}. The user is notified and the action
        is logged.
      </p>

      <AdminErrorNote>{error}</AdminErrorNote>

      <AdminField
        id="aa-password"
        label="New password"
        hint="At least 8 characters."
      >
        <input
          id="aa-password"
          type="text"
          autoComplete="off"
          value={password}
          disabled={busy}
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            setPassword(event.target.value);
            if (event.target.value.length >= 8) setInvalid(false);
          }}
          className={cx(ADMIN_CONTROL, "aria-[invalid=true]:border-pd-red")}
        />
        {invalid && (
          <span role="alert" className="text-xs font-semibold text-pd-red">
            Password must be at least 8 characters.
          </span>
        )}
      </AdminField>

      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Password type">
        <OptionRow checked={mode === "temporary"} onChange={() => setMode("temporary")}>
          Temporary, must be reset on next login
        </OptionRow>
        <OptionRow checked={mode === "permanent"} onChange={() => setMode("permanent")}>
          Permanent
        </OptionRow>
      </div>
    </PdDialog>
  );
}

/**
 * "Change contact" dialog (design 22): a new email and/or phone, both
 * optional but at least one required. Admin logins have no phone field, so
 * that input is hidden for them (the server would refuse it anyway).
 * Mount it only while open.
 */
export function ChangeContactDialog({ account, onCancel, onSubmit }: DialogProps) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const newEmail = email.trim();
    const newPhone = phone.trim();

    if (!newEmail && !newPhone) {
      setError("Enter a new email or phone.");

      return;
    }

    setBusy(true);
    setError("");

    const message = await onSubmit({
      newEmail: newEmail || undefined,
      newPhone: newPhone || undefined,
    });

    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  return (
    <PdDialog
      title="Change contact"
      onClose={busy ? () => {} : onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} disabled={busy} className={adminBtn("sec")}>
            Cancel
          </button>
          <button type="button" onClick={() => void save()} disabled={busy} className={adminBtn("pri")}>
            {busy ? "Saving…" : "Save contact"}
          </button>
        </>
      }
    >
      <p>
        Change the email or phone {accountName(account)} logs in with. The action is logged.
      </p>

      <AdminErrorNote>{error}</AdminErrorNote>

      <AdminField
        id="aa-email"
        label="New email"
        optional
        hint={`Leave blank to keep ${account.email}.`}
      >
        <input
          id="aa-email"
          type="email"
          autoComplete="off"
          value={email}
          disabled={busy}
          onChange={(event) => setEmail(event.target.value)}
          className={ADMIN_CONTROL}
        />
      </AdminField>

      {account.role !== "admin" && (
        <AdminField id="aa-phone" label="New phone" optional>
          <input
            id="aa-phone"
            type="tel"
            autoComplete="off"
            placeholder="+91XXXXXXXXXX"
            value={phone}
            disabled={busy}
            onChange={(event) => setPhone(event.target.value)}
            className={ADMIN_CONTROL}
          />
        </AdminField>
      )}
    </PdDialog>
  );
}
