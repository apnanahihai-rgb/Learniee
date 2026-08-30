"use client";

import { useAdminUsers } from "@/features/admin/hooks/useAdminUsers";
import UsersTable from "@/features/admin/components/UsersTable";
import UserDetailPanel from "@/features/admin/components/UserDetailPanel";

export default function AdminUsersPage() {
  const {
    users,
    search,
    setSearch,
    loading,
    error,
    deletingEmail,
    handleDelete,
    viewingUser,
    setViewingUser,
  } = useAdminUsers();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-purple-600 mb-1">Manage Users</h1>
      <p className="text-sm text-gray-500 mb-6">
        Delete a user&apos;s account and all their data from Cognito and the database.
      </p>

      <input
        type="text"
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md mb-4 px-4 py-2 border rounded-lg"
      />

      {error && (
        <div className="mb-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading users…</p>
      ) : (
        <UsersTable
          users={users}
          deletingEmail={deletingEmail}
          onView={setViewingUser}
          onDelete={handleDelete}
        />
      )}

      {viewingUser && (
        <UserDetailPanel
          email={viewingUser.email}
          role={viewingUser.role}
          onClose={() => setViewingUser(null)}
        />
      )}
    </div>
  );
}
