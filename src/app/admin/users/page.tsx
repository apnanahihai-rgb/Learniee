"use client";

import { useEffect, useState } from "react";

type AdminUser = {
  firstName: string;
  lastName: string;
  email: string;
  role: "parent" | "teacher";
};

const EXCLUDED_KEYS = ["id", "cognitoSub", "cognitoId", "parentId", "teacherId"];

function formatLabel(key: string) {
  const spaced = key.replace(/([A-Z])/g, " $1").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(value).toLocaleString();
  }
  return String(value);
}

function DetailPanel({
  email,
  role,
  onClose,
}: {
  email: string;
  role: "parent" | "teacher";
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/user-details?email=${encodeURIComponent(email)}&role=${role}`
        );
        if (!res.ok) throw new Error("Failed to load details");
        const data = await res.json();
        if (!cancelled) setDetail(data.user);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, [email, role]);

  const flatEntries = detail
    ? Object.entries(detail).filter(
        ([key, value]) =>
          !EXCLUDED_KEYS.includes(key) &&
          value !== null &&
          value !== undefined &&
          typeof value !== "object"
      )
    : [];

  const arrayEntries = detail
    ? Object.entries(detail).filter(
        ([, value]) => Array.isArray(value) && value.length > 0
      )
    : [];

  const objectEntries = detail
    ? Object.entries(detail).filter(
        ([, value]) => value !== null && typeof value === "object" && !Array.isArray(value)
      )
    : [];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-800">User Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {loading && <p className="text-gray-500">Loading…</p>}
          {error && <p className="text-red-600 text-sm">{error}</p>}

          {detail && (
            <div className="space-y-6">
              <div className="space-y-3">
                {flatEntries.map(([key, value]) => (
                  <div key={key}>
                    <div className="text-xs uppercase tracking-wide text-gray-400">
                      {formatLabel(key)}
                    </div>
                    <div className="text-sm text-gray-800">{formatValue(value)}</div>
                  </div>
                ))}
              </div>

              {arrayEntries.map(([key, value]) => (
                <div key={key}>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">
                    {formatLabel(key)}
                  </h3>
                  <div className="space-y-3">
                    {(value as Record<string, unknown>[]).map((item, i) => (
                      <div key={i} className="border rounded-lg p-3 bg-gray-50 space-y-1">
                        {Object.entries(item)
                          .filter(
                            ([k, v]) =>
                              !EXCLUDED_KEYS.includes(k) &&
                              v !== null &&
                              v !== undefined &&
                              typeof v !== "object"
                          )
                          .map(([k, v]) => (
                            <div key={k} className="text-xs">
                              <span className="text-gray-400">{formatLabel(k)}: </span>
                              <span className="text-gray-800">{formatValue(v)}</span>
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {objectEntries.map(([key, value]) => (
                <div key={key}>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">
                    {formatLabel(key)}
                  </h3>
                  <div className="border rounded-lg p-3 bg-gray-50 space-y-1">
                    {Object.entries(value as Record<string, unknown>)
                      .filter(
                        ([k, v]) =>
                          !EXCLUDED_KEYS.includes(k) &&
                          v !== null &&
                          v !== undefined &&
                          typeof v !== "object"
                      )
                      .map(([k, v]) => (
                        <div key={k} className="text-xs">
                          <span className="text-gray-400">{formatLabel(k)}: </span>
                          <span className="text-gray-800">{formatValue(v)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<AdminUser | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.users);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers();
  }, []);

  async function handleDelete(user: AdminUser) {
    const confirmed = window.confirm(
      `Permanently delete ${user.firstName} ${user.lastName} (${user.email})? This removes them from Cognito and the database. This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingEmail(user.email);
    setError(null);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, role: user.role }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Delete failed");
      }
      setUsers((prev) => prev.filter((u) => u.email !== user.email));
      if (viewingUser?.email === user.email) setViewingUser(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingEmail(null);
    }
  }

  const filtered = users.filter((u) =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

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
        <div className="mb-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading users…</p>
      ) : (
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
              {filtered.map((u) => (
                <tr key={u.email} className="border-t">
                  <td className="px-4 py-3">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3 capitalize">{u.role}</td>
                  <td className="px-4 py-3 text-right space-x-4">
                    <button
                      onClick={() => setViewingUser(u)}
                      className="text-purple-600 hover:text-purple-700 font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      disabled={deletingEmail === u.email}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50 font-medium"
                    >
                      {deletingEmail === u.email ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {viewingUser && (
        <DetailPanel
          email={viewingUser.email}
          role={viewingUser.role}
          onClose={() => setViewingUser(null)}
        />
      )}
    </div>
  );
}