"use client";

import { adminTag } from "@/features/admin/components/ui/adminStyles";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminPerson,
} from "@/features/admin/components/ui/design";
import { formatAdminDate } from "@/features/admin/components/ui/primitives";
import type { ParentDirectoryRow } from "@/features/admin/hooks/useParentDirectory";

/**
 * Parent directory table (design 19). Columns: Parent, Location, Onboarding,
 * Students, Active, Wallet, Joined. Built on the shared `AdminDataTable`, so it
 * turns into stacked cards on phones like every other redesigned table.
 */
export default function ParentDirectoryTable({ parents }: { parents: ParentDirectoryRow[] }) {
  if (parents.length === 0) {
    return <AdminEmptyState message="No parents match your search." />;
  }

  return (
    <AdminDataTable
      rows={parents}
      rowKey={(parent) => parent.id}
      columns={[
        {
          label: "Parent",
          block: true,
          render: (parent) => <AdminPerson name={parent.name} meta={parent.email} />,
        },
        {
          label: "Location",
          render: (parent) => [parent.city, parent.country].filter(Boolean).join(", ") || "—",
        },
        {
          label: "Onboarding",
          render: (parent) => (
            <span className={adminTag(parent.onboardingComplete ? "violet" : "amber")}>
              {parent.onboardingComplete ? "Complete" : "Incomplete"}
            </span>
          ),
        },
        { label: "Students", right: true, render: (parent) => parent.studentsCount },
        { label: "Active", right: true, render: (parent) => parent.activeEnrollmentsCount },
        {
          label: "Wallet",
          right: true,
          render: (parent) => `₹${parent.walletBalance.toLocaleString("en-IN")}`,
        },
        {
          label: "Joined",
          nowrap: true,
          render: (parent) => formatAdminDate(parent.createdAt),
        },
      ]}
    />
  );
}
