"use client";

import type { AdminUser } from "@/features/admin/types/user";
import { adminBtn, adminTag } from "@/features/admin/components/ui/adminStyles";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminPerson,
} from "@/features/admin/components/ui/design";

interface UsersTableProps {
  users: AdminUser[];
  onView: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}

/**
 * Manage users table (design 20). Columns: User, Role, Actions (View, Delete).
 * Built on the shared `AdminDataTable`, so it turns into stacked cards on phones.
 */
export default function UsersTable({ users, onView, onDelete }: UsersTableProps) {
  if (users.length === 0) {
    return <AdminEmptyState message="No users match your search." />;
  }

  return (
    <AdminDataTable
      rows={users}
      rowKey={(user) => `${user.role}:${user.email}`}
      columns={[
        {
          label: "User",
          block: true,
          render: (user) => (
            <AdminPerson name={`${user.firstName} ${user.lastName}`.trim() || user.email} meta={user.email} />
          ),
        },
        {
          label: "Role",
          render: (user) => <span className={adminTag("violet")}>{user.role}</span>,
        },
        {
          label: "Actions",
          right: true,
          block: true,
          render: (user) => {
            const name = `${user.firstName} ${user.lastName}`.trim() || user.email;

            return (
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onView(user)}
                  aria-label={`View ${name}`}
                  className={adminBtn("out", "sm")}
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(user)}
                  aria-label={`Delete ${name}`}
                  className={adminBtn("dtx", "sm")}
                >
                  Delete
                </button>
              </div>
            );
          },
        },
      ]}
    />
  );
}
