"use client";

import { adminTag, type AdminTagColor } from "@/features/admin/components/ui/adminStyles";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminPerson,
} from "@/features/admin/components/ui/design";
import { formatAdminDate } from "@/features/admin/components/ui/primitives";
import type { TeacherDirectoryRow } from "@/features/admin/hooks/useTeacherDirectory";

/**
 * Teacher directory table (design 18). Columns: Teacher, Location, Status,
 * Courses, Active, Rating, Joined. Built on the shared `AdminDataTable`, so it
 * turns into stacked cards on phones like every other redesigned table.
 */

const STATUS: Record<TeacherDirectoryRow["approvalStatus"], { label: string; color: AdminTagColor }> = {
  APPROVED: { label: "Approved", color: "green" },
  PENDING: { label: "Pending", color: "amber" },
  REJECTED: { label: "Rejected", color: "red" },
};

export default function TeacherDirectoryTable({ teachers }: { teachers: TeacherDirectoryRow[] }) {
  if (teachers.length === 0) {
    return <AdminEmptyState message="No teachers match your search." />;
  }

  return (
    <AdminDataTable
      rows={teachers}
      rowKey={(teacher) => teacher.id}
      columns={[
        {
          label: "Teacher",
          block: true,
          render: (teacher) => <AdminPerson name={teacher.name} meta={teacher.email} />,
        },
        {
          label: "Location",
          render: (teacher) => [teacher.city, teacher.country].filter(Boolean).join(", ") || "—",
        },
        {
          label: "Status",
          render: (teacher) => {
            const status = STATUS[teacher.approvalStatus] ?? STATUS.REJECTED;

            return <span className={adminTag(status.color)}>{status.label}</span>;
          },
        },
        { label: "Courses", render: (teacher) => teacher.coursesCount },
        { label: "Active", right: true, render: (teacher) => teacher.activeEnrollmentsCount },
        {
          label: "Rating",
          right: true,
          render: (teacher) =>
            teacher.averageRating === null ? "—" : teacher.averageRating.toFixed(1),
        },
        {
          label: "Joined",
          nowrap: true,
          render: (teacher) => formatAdminDate(teacher.createdAt),
        },
      ]}
    />
  );
}
