"use client";

import type { AdminUser } from "@/features/admin/types/user";

interface UsersTableProps {
  users: AdminUser[];
  deletingEmail: string | null;
  onView: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}

export default function UsersTable({ users, deletingEmail, onView, onDelete }: UsersTableProps) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-left text-gray-600">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.email} className="border-t">
              <td className="px-4 py-3">
                {u.firstName} {u.lastName}
              </td>
              <td className="px-4 py-3">{u.email}</td>
              <td className="px-4 py-3 capitalize">{u.role}</td>
              <td className="px-4 py-3 text-right space-x-4">
                <button
                  onClick={() => onView(u)}
                  className="text-purple-600 hover:text-purple-700 font-medium"
                >
                  View
                </button>
                <button
                  onClick={() => onDelete(u)}
                  disabled={deletingEmail === u.email}
                  className="text-red-600 hover:text-red-700 disabled:opacity-50 font-medium"
                >
                  {deletingEmail === u.email ? "Deleting…" : "Delete"}
                </button>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
