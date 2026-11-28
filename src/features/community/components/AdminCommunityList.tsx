"use client";

import Link from "next/link";
import { useState } from "react";

import { ADMIN_CARD, adminBtn, adminTag } from "@/features/admin/components/ui/adminStyles";
import {
  AdminEmptyState,
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminStack,
  AdminToast,
} from "@/features/admin/components/ui/design";

import { useAdminCommunities } from "../hooks/useAdminCommunities";
import CommunityFormDialog from "./CommunityFormDialog";
import { formatPrice } from "../utils/format";

/**
 * Admin "Communities": create a community and open one to manage its files
 * and members. Data: GET/POST /api/admin/communities (verified Admin auth).
 */
export default function AdminCommunityList() {
  const { communities, loading, error, create } = useAdminCommunities();
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState("");

  return (
    <AdminStack>
      <AdminHead
        title="Communities"
        description="Spaces where you share free study material. Parents join, read and react; only you can post."
        actions={
          <button type="button" className={adminBtn("pri")} onClick={() => setCreating(true)}>
            New community
          </button>
        }
      />

      <AdminErrorNote>{error}</AdminErrorNote>

      {loading ? (
        <AdminLoadingState />
      ) : communities.length === 0 ? (
        <AdminEmptyState title="No communities yet" message="Create the first one to start sharing material." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {communities.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/communities/${c.id}`}
                className={`${ADMIN_CARD} flex h-full flex-col gap-3 p-5 transition-colors hover:border-pd-brand`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-[18px] font-semibold">{c.title}</h2>
                  <span className={adminTag(c.isPaid ? "amber" : "green")}>
                    {c.isPaid ? `Paid · ${formatPrice(c.price)}` : "Free"}
                  </span>
                  {c.status === "HIDDEN" && <span className={adminTag("gray")}>Hidden</span>}
                </div>
                <p className="line-clamp-2 text-pd-ink2">{c.description}</p>
                <p className="mt-auto text-[13px] font-semibold text-pd-ink3">
                  {c.fileCount} {c.fileCount === 1 ? "file" : "files"} · {c.memberCount}{" "}
                  {c.memberCount === 1 ? "member" : "members"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <CommunityFormDialog
          heading="New community"
          confirmLabel="Create"
          onCancel={() => setCreating(false)}
          onSubmit={async (values) => {
            const result = await create(values);

            if (!result.ok) return result.error;

            setCreating(false);
            setToast("Community created");
            setTimeout(() => setToast(""), 2500);

            return null;
          }}
        />
      )}

      {toast && <AdminToast message={toast} />}
    </AdminStack>
  );
}
