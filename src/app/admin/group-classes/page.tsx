"use client";

import CourseApprovalCard from "@/features/admin/components/CourseApprovalCard";
import {
  AdminEmptyState,
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminStack,
} from "@/features/admin/components/ui/design";
import { AdminQueue, type AdminQueueItem } from "@/features/admin/components/ui/queue";
import { useCoursesList } from "@/features/admin/hooks/useCoursesList";

export default function AdminGroupClassesPage() {
  // Same data + decision routes as Course approvals, limited to Class type "Group":
  // GET /api/admin/courses?type=group, PATCH /api/admin/courses/[id]/approval.
  const { courses, loading, error, busyId, updateApproval } = useCoursesList({ groupOnly: true });

  const items: AdminQueueItem[] = courses.map((course) => ({
    id: course.id,
    group: course.subject,
    date: course.createdAt,
    searchText: [
      course.courseTitle,
      course.subject,
      course.teacher.firstName,
      course.teacher.lastName,
      course.teacher.email,
    ]
      .filter(Boolean)
      .join(" "),
    render: ({ open, onToggle, waitingTag }) => (
      <CourseApprovalCard
        course={course}
        open={open}
        onToggle={onToggle}
        waitingTag={waitingTag}
        busy={busyId === course.id}
        onApprove={(id) => void updateApproval(id, "APPROVED")}
        onReject={(id) => void updateApproval(id, "REJECTED")}
      />
    ),
  }));

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Approvals" }]}
        title="Group classes"
        description="Review group classes submitted by teachers. Approved ones appear with the normal courses, marked as Group."
      />

      <AdminErrorNote>{error}</AdminErrorNote>

      {loading ? (
        <AdminLoadingState message="Loading group classes…" />
      ) : courses.length === 0 ? (
        <AdminEmptyState message="No group classes are waiting for approval." />
      ) : (
        <AdminQueue items={items} searchPlaceholder="Filter by title, subject or teacher" />
      )}
    </AdminStack>
  );
}
