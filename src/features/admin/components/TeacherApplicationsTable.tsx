"use client";

import Link from "next/link";

import type { AdminTeacherSummary } from "@/features/admin/types/teacher";
import { getCompleteness } from "@/features/admin/utils/teacherCompleteness";
import { adminBtn, adminTag } from "@/features/admin/components/ui/adminStyles";
import {
  AdminDataTable,
  AdminPerson,
  type AdminColumn,
} from "@/features/admin/components/ui/design";
import { formatAdminDate } from "@/features/admin/components/ui/primitives";

interface Props {
  teachers: AdminTeacherSummary[];
  /** "Submitted" while reviewing the queue, "Last updated" for decided applications. */
  dateLabel: string;
}

function fullName(teacher: AdminTeacherSummary) {
  return `${teacher.firstName ?? ""} ${teacher.lastName ?? ""}`.trim();
}

export default function TeacherApplicationsTable({ teachers, dateLabel }: Props) {
  const columns: Array<AdminColumn<AdminTeacherSummary>> = [
    {
      label: "Teacher",
      block: true,
      render: (teacher) => <AdminPerson name={fullName(teacher)} meta={teacher.email} />,
    },
    {
      label: "Location",
      render: (teacher) => [teacher.city, teacher.country].filter(Boolean).join(", ") || "—",
    },
    {
      label: "Experience",
      render: (teacher) => (
        <>
          {teacher.qualifications || "—"}
          {teacher.overallExperience && (
            <small className="block text-xs text-pd-ink3">{teacher.overallExperience} yrs</small>
          )}
        </>
      ),
    },
    {
      label: "Documents",
      render: (teacher) => {
        const { missingRequired } = getCompleteness(teacher.fileTypes, teacher.hasPan);

        return (
          <>
            <span className={adminTag(missingRequired === 0 ? "violet" : "amber")}>
              {missingRequired === 0 ? "Complete" : `${missingRequired} missing`}
            </span>
            {teacher.approvalStatus === "PENDING" && teacher.interviewScheduledAt && (
              <small className="block text-xs font-semibold text-pd-brand-d">
                Interview {formatAdminDate(teacher.interviewScheduledAt)}
              </small>
            )}
            {teacher.appealCount > 0 && (
              <small className="block text-xs font-semibold text-pd-brand-d">
                Appeal #{teacher.appealCount}
              </small>
            )}
          </>
        );
      },
    },
    {
      label: dateLabel,
      nowrap: true,
      render: (teacher) => formatAdminDate(teacher.updatedAt),
    },
    {
      label: "Action",
      right: true,
      block: true,
      render: (teacher) => (
        <Link href={`/admin/teachers/${teacher.id}`} className={adminBtn("pri", "sm")}>
          Review
        </Link>
      ),
    },
  ];

  return <AdminDataTable columns={columns} rows={teachers} rowKey={(teacher) => teacher.id} />;
}
