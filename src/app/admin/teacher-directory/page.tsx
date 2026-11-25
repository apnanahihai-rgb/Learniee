"use client";

import TeacherDirectoryTable from "@/features/admin/components/TeacherDirectoryTable";
import {
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminSearchBox,
  AdminStack,
  AdminStats,
} from "@/features/admin/components/ui/design";
import { useTeacherDirectory } from "@/features/admin/hooks/useTeacherDirectory";

/**
 * Admin "Teacher directory" (design 18). Every teacher with approval status,
 * courses, active enrollments and rating.
 * Data: GET /api/admin/directory/teachers (verified Admin auth, read-only),
 * see `directory.service.ts`. Re-fetches on the realtime feed.
 */
export default function AdminTeacherDirectoryPage() {
  const { teachers, summary, search, setSearch, loading, error } = useTeacherDirectory();

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "People" }]}
        title="Teacher directory"
        description="Every teacher on the platform, with approval and onboarding status at a glance."
      />

      <AdminStats
        items={[
          { label: "Total", value: summary?.total ?? "—" },
          { label: "Approved", value: summary?.approvalStatus.approved ?? "—" },
          { label: "Pending", value: summary?.approvalStatus.pending ?? "—" },
          { label: "Rejected", value: summary?.approvalStatus.rejected ?? "—" },
        ]}
      />

      <div className="flex flex-wrap items-center gap-3">
        <AdminSearchBox value={search} onChange={setSearch} placeholder="Search by name, email or city" />
      </div>

      <AdminErrorNote>{error}</AdminErrorNote>

      {loading ? (
        <AdminLoadingState message="Loading teachers…" />
      ) : (
        <TeacherDirectoryTable teachers={teachers} />
      )}
    </AdminStack>
  );
}
