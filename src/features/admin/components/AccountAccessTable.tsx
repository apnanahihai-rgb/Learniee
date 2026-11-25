"use client";

import { adminBtn, adminTag } from "@/features/admin/components/ui/adminStyles";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminPerson,
} from "@/features/admin/components/ui/design";
import type { ManagedAccount } from "@/features/shared/hooks/useAccountAccess";

interface AccountAccessTableProps {
  accounts: ManagedAccount[];
  onResetPassword: (account: ManagedAccount) => void;
  onChangeContact: (account: ManagedAccount) => void;
}

const fullName = (a: ManagedAccount) => `${a.firstName} ${a.lastName}`.trim() || a.email;

/**
 * Account access table (design 22). Columns: User, Role, Action
 * (Reset password / Change contact). Built on the shared `AdminDataTable`,
 * so it turns into stacked cards on phones.
 */
export default function AccountAccessTable({
  accounts,
  onResetPassword,
  onChangeContact,
}: AccountAccessTableProps) {
  if (accounts.length === 0) {
    return <AdminEmptyState title="No accounts found" message="No account matches your search." />;
  }

  return (
    <AdminDataTable
      rows={accounts}
      rowKey={(a) => `${a.role}-${a.id}`}
      columns={[
        {
          label: "User",
          block: true,
          render: (a) => <AdminPerson name={fullName(a)} meta={a.email} />,
        },
        {
          label: "Role",
          render: (a) => <span className={adminTag("violet")}>{a.role}</span>,
        },
        {
          label: "Action",
          right: true,
          block: true,
          render: (a) => (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => onResetPassword(a)}
                aria-label={`Reset password for ${fullName(a)}`}
                className={adminBtn("out", "sm")}
              >
                Reset password
              </button>
              <button
                type="button"
                onClick={() => onChangeContact(a)}
                aria-label={`Change contact for ${fullName(a)}`}
                className={adminBtn("out", "sm")}
              >
                Change contact
              </button>
            </div>
          ),
        },
      ]}
    />
  );
}
