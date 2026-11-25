"use client";

import { useEffect, useState } from "react";
import type { AdminUser } from "@/features/admin/types/user";
import { useAutoRefresh } from "@/features/shared/hooks/useAutoRefresh";
import { isBackgroundRefresh } from "@/lib/refreshBus";

/** Reads `{ error }` from a failed response without throwing on a non-JSON body. */
async function errorFrom(res: Response, fallback: string) {
  try {
    const body = await res.json();

    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<AdminUser | null>(null);

  async function loadUsers() {
    const background = isBackgroundRefresh();

    if (!background) setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });

      if (!res.ok) throw new Error(await errorFrom(res, "Failed to load users"));

      const data = await res.json();

      setUsers(data.users);
    } catch (e) {
      if (!background) setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAutoRefresh(() => loadUsers(), { paths: ["/api/admin/users", "/api/admin/delete-user"] });

  /**
   * Deletes the account. The page asks for confirmation first (in-page dialog).
   * Returns an error message to show in that dialog, or null when it worked.
   */
  async function handleDelete(user: AdminUser): Promise<string | null> {
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, role: user.role }),
      });

      if (!res.ok) return await errorFrom(res, "Delete failed");

      setUsers((prev) => prev.filter((u) => u.email !== user.email));
      if (viewingUser?.email === user.email) setViewingUser(null);

      return null;
    } catch {
      return "Could not reach the server. Check your connection and try again.";
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? users.filter((u) => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q))
    : users;

  return {
    users: filtered,
    search,
    setSearch,
    loading,
    error,
    handleDelete,
    viewingUser,
    setViewingUser,
  };
}
