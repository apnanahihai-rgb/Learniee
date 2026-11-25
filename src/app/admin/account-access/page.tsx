"use client";

import { useState } from "react";

import AccountAccessTable from "@/features/admin/components/AccountAccessTable";
import {
  ChangeContactDialog,
  ResetPasswordDialog,
} from "@/features/admin/components/AccountAccessDialogs";
import {
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminSearchBox,
  AdminStack,
} from "@/features/admin/components/ui/design";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";
import { useAccountAccess } from "@/features/shared/hooks/useAccountAccess";

type DialogKind = "password" | "contact";

/**
 * Admin "Account access" (design 22). Reset a login's password or change the
 * email/phone Cognito holds, for every role.
 * Data: GET/PATCH /api/admin/account-access (verified Admin auth; Cognito +
 * database, logged and notified), see `accountAccess.service.ts`.
 * Re-fetches on the realtime feed.
 */
export default function AdminAccountAccessPage() {
  const {
    accounts,
    loading,
    loadError,
    search,
    setSearch,
    target,
    openTarget,
    closeTarget,
    submit,
  } = useAccountAccess("/api/admin/account-access");
  const { toast, toastNode } = usePdToast();
  const [dialog, setDialog] = useState<DialogKind | null>(null);

  function open(kind: DialogKind, account: Parameters<typeof openTarget>[0]) {
    openTarget(account);
    setDialog(kind);
  }

  function close() {
    setDialog(null);
    closeTarget();
  }

  async function save(kind: DialogKind, input: Parameters<typeof submit>[0]) {
    const message = await submit(input);

    if (!message) {
      close();
      toast(kind === "password" ? "Password reset" : "Contact saved");
    }

    return message;
  }

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "People" }]}
        title="Account access"
        description="Reset a login's password or change the email or phone it uses. Every action is logged."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminSearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email or role"
        />
      </div>

      <AdminErrorNote>{loadError}</AdminErrorNote>

      {loading ? (
        <AdminLoadingState message="Loading accounts…" />
      ) : (
        <AccountAccessTable
          accounts={accounts}
          onResetPassword={(a) => open("password", a)}
          onChangeContact={(a) => open("contact", a)}
        />
      )}

      {target && dialog === "password" && (
        <ResetPasswordDialog
          account={target}
          onCancel={close}
          onSubmit={(input) => save("password", input)}
        />
      )}
      {target && dialog === "contact" && (
        <ChangeContactDialog
          account={target}
          onCancel={close}
          onSubmit={(input) => save("contact", input)}
        />
      )}

      {toastNode}
    </AdminStack>
  );
}
