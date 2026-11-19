"use client";

import { useState, type FormEvent } from "react";
import { Landmark } from "lucide-react";

import PdField from "@/features/parent/components/account/PdField";
import {
  PD_BTN_PRI,
  PD_BTN_SEC,
  PD_BTN_SEC_SM,
  PD_INPUT,
} from "@/features/parent/components/courses/pdUi";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";
import { Tag } from "@/features/parent/components/home/HomeBits";
import { maskAccountNumber } from "@/features/teacher/components/earnings/earningsLogic";
import { RequestsSkeleton } from "@/features/teacher/components/requests/RequestsUi";
import { useBankAccount, type BankAccount } from "@/features/teacher/hooks/useBankAccount";

const STATUS_TAG = {
  APPROVED: { label: "Approved", tone: "green" },
  PENDING: { label: "Pending approval", tone: "amber" },
  REJECTED: { label: "Rejected", tone: "red" },
} as const;

function Item({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0 border-t border-pd-line px-5 py-3.5 first:border-t-0 min-[640px]:border-t-0 min-[640px]:border-b min-[640px]:[&:nth-last-child(-n+2)]:border-b-0">
      <dt className="mb-0.5 text-xs font-semibold text-pd-ink3">{label}</dt>
      <dd className={`break-words text-[15px] font-medium ${value ? "text-pd-ink" : "font-normal text-pd-ink3"}`}>
        {value || "Not added"}
      </dd>
    </div>
  );
}

/** Teacher Earnings → Bank account: view the saved details or (re)submit them for Admin approval. */
export default function TeacherBankTab() {
  const { bankAccount, loading, saving, error, save } = useBankAccount();
  const { toast, toastNode } = usePdToast();
  const [editing, setEditing] = useState(false);

  if (loading && !bankAccount) return <RequestsSkeleton rows={1} height={260} />;

  const showForm = editing || !bankAccount;
  const status = bankAccount ? STATUS_TAG[bankAccount.status] : null;

  return (
    <section className="mt-5 max-w-[640px] overflow-hidden rounded-2xl border border-pd-line bg-white">
      <div className="flex items-center gap-3 border-b border-pd-line px-5 py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-pd-b50 text-pd-brand">
          <Landmark size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-base font-semibold text-pd-ink">Bank account</h2>
          <p className="text-[13px] text-pd-ink3">
            {showForm && !bankAccount
              ? "Add the account your payouts should go to."
              : "Payouts go here once an account is approved."}
          </p>
        </div>
        {status && <Tag tone={status.tone}>{status.label}</Tag>}
      </div>

      {bankAccount?.status === "REJECTED" && (
        <p className="border-b border-pd-line bg-pd-red-bg px-5 py-3 text-[13px] font-semibold text-pd-red">
          Admin rejected these details{bankAccount.rejectionReason ? `: ${bankAccount.rejectionReason}` : "."} Update
          them and resubmit.
        </p>
      )}

      {showForm ? (
        <BankForm
          key={bankAccount?.updatedAt ?? "new"}
          bankAccount={bankAccount}
          saving={saving}
          serverError={error}
          onCancel={bankAccount ? () => setEditing(false) : undefined}
          onSave={async (input) => {
            const ok = await save(input);

            if (ok) {
              setEditing(false);
              toast("Bank details sent for approval");
            }
          }}
        />
      ) : (
        bankAccount && (
          <>
            <dl className="m-0 grid grid-cols-1 min-[640px]:grid-cols-2">
              <Item label="Account holder" value={bankAccount.accountHolderName} />
              <Item label="Bank" value={bankAccount.bankName} />
              <Item label="Account number" value={maskAccountNumber(bankAccount.accountNumber)} />
              <Item label="IFSC" value={bankAccount.ifscCode} />
            </dl>

            <div className="flex flex-wrap items-center gap-3 border-t border-pd-line px-5 py-4">
              <p className="min-w-[200px] flex-1 text-[13px] text-pd-ink3">
                Changing details sends the account back for approval.
              </p>
              <button type="button" className={PD_BTN_SEC_SM} onClick={() => setEditing(true)}>
                Edit details
              </button>
            </div>
          </>
        )
      )}

      {toastNode}
    </section>
  );
}

function BankForm({
  bankAccount,
  saving,
  serverError,
  onSave,
  onCancel,
}: {
  bankAccount: BankAccount | null;
  saving: boolean;
  serverError: string;
  onSave: (input: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName?: string;
    branchName?: string;
  }) => Promise<void>;
  onCancel?: () => void;
}) {
  const [holder, setHolder] = useState(bankAccount?.accountHolderName ?? "");
  const [number, setNumber] = useState(bankAccount?.accountNumber ?? "");
  const [confirm, setConfirm] = useState(bankAccount?.accountNumber ?? "");
  const [ifsc, setIfsc] = useState(bankAccount?.ifscCode ?? "");
  const [bank, setBank] = useState(bankAccount?.bankName ?? "");
  const [branch, setBranch] = useState(bankAccount?.branchName ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const next: Record<string, string> = {};
    if (holder.trim().length < 2) next.holder = "Enter the name on the account.";
    if (number.length < 6) next.number = "Enter the account number.";
    if (confirm !== number) next.confirm = "Account numbers don’t match.";
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim())) next.ifsc = "Enter a valid IFSC, e.g. HDFC0001234.";

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    await onSave({
      accountHolderName: holder.trim(),
      accountNumber: number,
      ifscCode: ifsc.trim(),
      bankName: bank.trim() || undefined,
      branchName: branch.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 p-5">
      <PdField id="bk-holder" label="Account holder name" error={errors.holder}>
        <input
          id="bk-holder"
          className={PD_INPUT}
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
          placeholder="As it appears on your bank account"
          aria-invalid={Boolean(errors.holder)}
        />
      </PdField>

      <div className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2">
        <PdField id="bk-number" label="Account number" error={errors.number}>
          <input
            id="bk-number"
            inputMode="numeric"
            className={PD_INPUT}
            value={number}
            onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
            aria-invalid={Boolean(errors.number)}
          />
        </PdField>
        <PdField id="bk-confirm" label="Confirm account number" error={errors.confirm}>
          <input
            id="bk-confirm"
            inputMode="numeric"
            className={PD_INPUT}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
            aria-invalid={Boolean(errors.confirm)}
          />
        </PdField>
      </div>

      <PdField id="bk-ifsc" label="IFSC code" error={errors.ifsc}>
        <input
          id="bk-ifsc"
          className={`${PD_INPUT} uppercase`}
          value={ifsc}
          onChange={(e) => setIfsc(e.target.value.toUpperCase())}
          placeholder="e.g. HDFC0001234"
          aria-invalid={Boolean(errors.ifsc)}
        />
      </PdField>

      <div className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2">
        <PdField id="bk-bank" label="Bank name (optional)">
          <input id="bk-bank" className={PD_INPUT} value={bank} onChange={(e) => setBank(e.target.value)} />
        </PdField>
        <PdField id="bk-branch" label="Branch (optional)">
          <input id="bk-branch" className={PD_INPUT} value={branch} onChange={(e) => setBranch(e.target.value)} />
        </PdField>
      </div>

      {serverError && (
        <p role="alert" className="text-xs font-bold text-pd-red">
          {serverError}
        </p>
      )}

      <p className="text-xs text-pd-ink3">Every submission, new or edited, needs Admin’s approval before it’s used.</p>

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <button type="button" className={PD_BTN_SEC} onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={saving} className={PD_BTN_PRI}>
          {saving ? "Submitting…" : bankAccount ? "Resubmit for approval" : "Submit for approval"}
        </button>
      </div>
    </form>
  );
}
