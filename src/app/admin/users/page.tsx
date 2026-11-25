"use client";

import { useState } from "react";

import UserDetailPanel from "@/features/admin/components/UserDetailPanel";
import UsersTable from "@/features/admin/components/UsersTable";
import AdminConfirmDialog from "@/features/admin/components/ui/AdminConfirmDialog";
import {
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminSearchBox,
  AdminStack,
} from "@/features/admin/components/ui/design";
import { useAdminUsers } from "@/features/admin/hooks/useAdminUsers";
import type { AdminUser } from "@/features/admin/types/user";
import { usePdToast } from "@/features/parent/components/courses/usePdToast";

/**
 * Admin "Manage users" (design 20). Parents and teachers with View and Delete.
 * Data: GET /api/admin/users; delete: POST /api/admin/delete-user (verified Admin
 * auth, removes the Cognito login and the database rows, logs USER_DELETED),
 * see `userManagement.service.ts`. Re-fetches on the realtime feed.
 */
export default function AdminUsersPage() {
  const { users, search, setSearch, loading, error, handleDelete, viewingUser, setViewingUser } =
    useAdminUsers();
  const { toast, toastNode } = usePdToast();
  const [confirming, setConfirming] = useState<AdminUser | null>(null);

  const confirmName = confirming ? `${confirming.firstName} ${confirming.lastName}`.trim() || confirming.email : "";

  async function confirmDelete() {
    if (!confirming) return null;

    const message = await handleDelete(confirming);

    if (!message) {
      setConfirming(null);
      toast("Account deleted");
    }

    return message;
  }

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "People" }]}
        title="Manage users"
        description="Delete a user's account and all their data from Cognito and the database."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminSearchBox value={search} onChange={setSearch} placeholder="Search by name or email" />
      </div>

      <AdminErrorNote>{error}</AdminErrorNote>

      {loading ? (
        <AdminLoadingState message="Loading users…" />
      ) : (
        <UsersTable users={users} onView={setViewingUser} onDelete={setConfirming} />
      )}

      {viewingUser && (
        <UserDetailPanel
          email={viewingUser.email}
          role={viewingUser.role}
          onClose={() => setViewingUser(null)}
        />
      )}

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
