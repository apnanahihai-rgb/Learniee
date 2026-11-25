"use client";

import type { StaffAccount } from "@/features/admin/types/staffAccount";
import { adminBtn, adminTag } from "@/features/admin/components/ui/adminStyles";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminPerson,
} from "@/features/admin/components/ui/design";

interface StaffAccountsTableProps {
  accounts: StaffAccount[];
  onDelete: (account: StaffAccount) => void;
}

const fullName = (a: StaffAccount) => `${a.firstName} ${a.lastName}`.trim() || a.email;

/**
 * Staff accounts table (design 21). Columns: Name, Phone, Role, Action.
 * Built on the shared `AdminDataTable`, so it turns into stacked cards on phones.
 */
export default function StaffAccountsTable({ accounts, onDelete }: StaffAccountsTableProps) {
  if (accounts.length === 0) {
    return <AdminEmptyState title="No staff yet" message="Staff accounts you create will show up here." />;
  }

  return (
    <AdminDataTable
      rows={accounts}
      rowKey={(a) => a.id}
      columns={[
        {
          label: "Name",
          block: true,
          render: (a) => <AdminPerson name={fullName(a)} meta={a.email} />,
        },
        {
          label: "Phone",
          render: (a) => <span className="whitespace-nowrap">{a.phone}</span>,
        },
        {
          label: "Role",
          render: (a) => <span className={adminTag("violet")}>{a.role.toLowerCase()}</span>,
        },
        {
          label: "Action",
          right: true,
          block: true,
          render: (a) => (
            <button
              type="button"
              onClick={() => onDelete(a)}
              aria-label={`Delete ${fullName(a)}`}
              className={adminBtn("dtx", "sm")}
            >
              Delete
            </button>
          ),
        },
      ]}
    />
  );
}
