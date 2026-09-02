"use client";

import type { StaffAccount } from "@/features/admin/types/staffAccount";

interface StaffAccountsTableProps {
  accounts: StaffAccount[];
  deletingId: string | null;
  onDelete: (account: StaffAccount) => void;
}

export default function StaffAccountsTable({ accounts, deletingId, onDelete }: StaffAccountsTableProps) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-left text-gray-600">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Phone</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id} className="border-t">
              <td className="px-4 py-3">
                {a.firstName} {a.lastName}
              </td>
              <td className="px-4 py-3">{a.email}</td>
              <td className="px-4 py-3">{a.phone}</td>
              <td className="px-4 py-3 capitalize">{a.role.toLowerCase()}</td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onDelete(a)}
                  disabled={deletingId === a.id}
                  className="text-red-600 hover:text-red-700 disabled:opacity-50 font-medium"
                >
                  {deletingId === a.id ? "Deleting…" : "Delete"}
                </button>
              </td>
            </tr>
          ))}
          {accounts.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                No staff accounts yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
