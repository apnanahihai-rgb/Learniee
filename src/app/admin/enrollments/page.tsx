"use client";

import EnrollmentApprovalCard, {
  formatRupees,
} from "@/features/admin/components/EnrollmentApprovalCard";
import {
  AdminEmptyState,
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminStack,
} from "@/features/admin/components/ui/design";
import { AdminQueue, type AdminQueueItem } from "@/features/admin/components/ui/queue";
import { useAdminEnrollments } from "@/features/admin/hooks/useEnrollments";

export default function AdminEnrollmentsPage() {
  // Data: GET /api/admin/enrollments, decisions: PATCH
  // /api/admin/enrollments/[id]/approval (verified Admin auth, live
  // refresh, Activity Log entry on every decision).
  const { enrollments, loading, error, busyId, updateApproval } = useAdminEnrollments();

  const items: AdminQueueItem[] = enrollments.map((enrollment) => {
    const teacher =
      enrollment.teacher.visibleName?.trim() ||
      `${enrollment.teacher.firstName} ${enrollment.teacher.lastName}`.trim();
    const parent = `${enrollment.parent.firstName} ${enrollment.parent.lastName}`.trim();
    const child = enrollment.student.visibleName || enrollment.student.firstName;

    return {
      id: enrollment.id,
      group: teacher,
      date: enrollment.createdAt,
      amount: Number(enrollment.amountPaid) || 0,
      searchText: [
        enrollment.course.courseTitle,
        teacher,
        parent,
        child,
        enrollment.parent.email,
        formatRupees(enrollment.amountPaid),
      ]
        .filter(Boolean)
        .join(" "),
      render: ({ open, onToggle, waitingTag }) => (
        <EnrollmentApprovalCard
          enrollment={enrollment}
          open={open}
          onToggle={onToggle}
          waitingTag={waitingTag}
          busy={busyId === enrollment.id}
          onApprove={(id) => void updateApproval(id, "APPROVE")}
          onReject={(id, reason) => void updateApproval(id, "REJECT", reason)}
        />
      ),
    };
  });

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Approvals" }]}
        title="Enrollment approvals"
        description="Enrollments the teacher has already approved. This is the final step before a student is active."
      />

      <AdminErrorNote>{error}</AdminErrorNote>

      {loading ? (
        <AdminLoadingState message="Loading enrollments…" />
      ) : enrollments.length === 0 ? (
        <AdminEmptyState message="No enrollments are waiting for approval." />
      ) : (
        <AdminQueue
          items={items}
          amountLabel="Total paid"
          searchPlaceholder="Filter by course, teacher, parent or child"
        />
      )}
    </AdminStack>
  );
}
