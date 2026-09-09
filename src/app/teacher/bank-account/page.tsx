"use client";

import { useEffect, useState } from "react";
import { Landmark } from "lucide-react";

import { useBankAccount } from "@/features/teacher/hooks/useBankAccount";
import ErrorBanner from "@/features/shared/components/ErrorBanner";

/**
 * "Bank Account" (Teacher Payouts, Sep 9, 2026) — previously not
 * modeled at all (03-DATA-MODEL.md listed `BankAccount` as a Month-2
 * entity). Accounts' Payment Queue mass-pay skips any teacher without
 * one of these on file, so this is the piece that unblocks that.
 *
 * Plain-text account number/IFSC for now — flagged, not solved, see
 * 06-OPEN-DECISIONS.md #46.
 */
export default function TeacherBankAccountPage() {
  const { bankAccount, loading, saving, error, success, save } = useBankAccount();

  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [mismatchError, setMismatchError] = useState("");

  useEffect(() => {
    if (bankAccount) {
      setAccountHolderName(bankAccount.accountHolderName);
      setAccountNumber(bankAccount.accountNumber);
      setConfirmAccountNumber(bankAccount.accountNumber);
      setIfscCode(bankAccount.ifscCode);
      setBankName(bankAccount.bankName ?? "");
      setBranchName(bankAccount.branchName ?? "");
    }
  }, [bankAccount]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMismatchError("");

    if (accountNumber !== confirmAccountNumber) {
      setMismatchError("Account numbers don't match.");
      return;
    }

    await save({
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName: bankName || undefined,
      branchName: branchName || undefined,
    });
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
          <Landmark size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Bank Account</h1>
          <p className="text-sm text-gray-500 mt-1">
            Where Accounts pays your cycle earnings once a payout is verified and queued.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border rounded-2xl p-6 shadow-sm space-y-5">
          {error && <ErrorBanner size="compact" spacing={false}>{error}</ErrorBanner>}
          {mismatchError && (
            <ErrorBanner size="compact" spacing={false}>{mismatchError}</ErrorBanner>
          )}
          {success && !error && (
            <div className="bg-green-100 text-green-700 p-3 rounded-lg text-sm">
              Bank details saved.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
            <input
              type="text"
              required
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="As it appears on your bank account"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
              <input
                type="text"
                required
                inputMode="numeric"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Account Number
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                value={confirmAccountNumber}
                onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ""))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
            <input
              type="text"
              required
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              className="w-full border rounded-lg px-3 py-2 text-sm uppercase"
              placeholder="e.g. HDFC0001234"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name (optional)</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch (optional)</label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-brand hover:bg-brand-dark text-white font-medium py-2.5 rounded-lg disabled:opacity-50"
          >
            {saving ? "Saving…" : bankAccount ? "Update Bank Details" : "Save Bank Details"}
          </button>
        </form>
      )}
    </div>
  );
}
