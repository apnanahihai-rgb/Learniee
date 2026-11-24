"use client";

import { useState } from "react";

import TeacherApplicationsTable from "@/features/admin/components/TeacherApplicationsTable";
import {
  AdminEmptyState,
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminPillTabs,
  AdminSearchBox,
  AdminStack,
} from "@/features/admin/components/ui/design";
import { useTeachersList } from "@/features/admin/hooks/useTeachersList";
import type { TeacherApprovalState } from "@/features/admin/types/teacher";

const TABS: Array<{ value: TeacherApprovalState; label: string }> = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

const EMPTY_MESSAGES: Record<TeacherApprovalState, string> = {
  PENDING: "No teachers are waiting for approval.",
  APPROVED: "No approved teachers yet.",
  REJECTED: "No rejected applications.",
};

export default function AdminTeachersPage() {
  const [status, setStatus] = useState<TeacherApprovalState>("PENDING");
  const [search, setSearch] = useState("");

  // Data: GET /api/admin/teachers?status=… (verified Admin auth, live refresh).
  const { teachers, counts, loading, error } = useTeachersList(status);

  const query = search.trim().toLowerCase();
  const visible = query
    ? teachers.filter((teacher) =>
        [teacher.firstName, teacher.lastName, teacher.visibleName, teacher.email, teacher.city]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query)),
      )
    : teachers;

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Approvals" }]}
        title="Teacher applications"
        description="Review registrations and approve or reject them."
      />

      <AdminPillTabs
        label="Application status"
        value={status}
        onChange={setStatus}
        tabs={TABS.map((tab) => ({ ...tab, count: counts[tab.value] }))}
      />

      <div className="-mt-2 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AdminSearchBox
            value={search}
            onChange={setSearch}
            placeholder="Filter by name, email or city"
          />
        </div>

        <AdminErrorNote>{error}</AdminErrorNote>

        {loading ? (
          <AdminLoadingState message="Loading teachers…" />
        ) : visible.length === 0 ? (
          <AdminEmptyState
            message={query ? "No teachers match your search." : EMPTY_MESSAGES[status]}
          />
        ) : (
          <TeacherApplicationsTable
            teachers={visible}
            dateLabel={status === "PENDING" ? "Submitted" : "Last updated"}
          />
        )}
      </div>
    </AdminStack>
  );
}
