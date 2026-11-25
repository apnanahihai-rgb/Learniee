"use client";

import { useState } from "react";

import CreateStaffAccountForm from "@/features/admin/components/CreateStaffAccountForm";
import StaffAccountsTable from "@/features/admin/components/StaffAccountsTable";
import AdminConfirmDialog from "@/features/admin/components/ui/AdminConfirmDialog";
import { adminBtn } from "@/features/admin/components/ui/adminStyles";
import {
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminStack,
} from "@/features/admin/components/ui/design";
import { useStaffAccounts } from "@/features/admin/hooks/useStaffAccounts";
import type { StaffAccount } from "@/features/admin/types/staffAccount";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";

/**
 * Admin "Staff accounts" (design 21). Create HR / IT / Accounts logins and delete them.
 * Data: GET/POST /api/admin/staff-accounts, DELETE /api/admin/staff-accounts/[id]
 * (verified Admin auth; Cognito + database), see `staffAccount.service.ts`.
 * Re-fetches on the realtime feed.
 */
export default function AdminStaffAccountsPage() {
  const { accounts, loading, error, handleDelete, handleCreated } = useStaffAccounts();
  const { toast, toastNode } = usePdToast();
  const [confirming, setConfirming] = useState<StaffAccount | null>(null);

  const confirmName = confirming
    ? `${confirming.firstName} ${confirming.lastName}`.trim() || confirming.email
    : "";

  async function confirmDelete() {
    if (!confirming) return null;

    const message = await handleDelete(confirming);

    if (!message) {
      setConfirming(null);
      toast("Staff account deleted");
    }

    return message;
  }

  function focusForm() {
    const field = document.getElementById("staff-first");

    field?.scrollIntoView({ behavior: "smooth", block: "center" });
    field?.focus({ preventScroll: true });
  }

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "People" }]}
        title="Staff accounts"
        description="Create and manage HR, IT and Accounts logins. Each gets a simple dashboard on first login."
        actions={
          <button type="button" onClick={focusForm} className={adminBtn("pri")}>
            Create staff account
          </button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <CreateStaffAccountForm
          onCreated={handleCreated}
          onDone={(account) => toast(`${account.firstName} ${account.lastName}`.trim() + " added")}
        />

        <div className="flex min-w-0 flex-col gap-6">
          <AdminErrorNote>{error}</AdminErrorNote>

          {loading ? (
            <AdminLoadingState message="Loading staff accounts…" />
          ) : (
            <StaffAccountsTable accounts={accounts} onDelete={setConfirming} />
          )}
        </div>
      </div>

      {confirming && (
        <AdminConfirmDialog
          title={`Delete ${confirmName}?`}
          confirmLabel="Delete account"
          danger
          onCancel={() => setConfirming(null)}
          onConfirm={confirmDelete}
        >
          <p>
            This removes the account and all their data from Cognito and the database. It cannot be
            undone.
          </p>
        </AdminConfirmDialog>
      )}

      {toastNode}
    </AdminStack>
  );
}
