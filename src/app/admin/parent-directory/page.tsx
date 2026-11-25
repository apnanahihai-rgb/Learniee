"use client";

import ParentDirectoryTable from "@/features/admin/components/ParentDirectoryTable";
import {
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminSearchBox,
  AdminStack,
  AdminStats,
} from "@/features/admin/components/ui/design";
import { useParentDirectory } from "@/features/admin/hooks/useParentDirectory";

/**
 * Admin "Parent directory" (design 19). Every parent with onboarding status,
 * students, active classes and Wallet balance.
 * Data: GET /api/admin/directory/parents (verified Admin auth, read-only),
 * see `directory.service.ts`. Re-fetches on the realtime feed.
 */
export default function AdminParentDirectoryPage() {
  const { parents, summary, search, setSearch, loading, error } = useParentDirectory();

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "People" }]}
        title="Parent directory"
        description="Every parent on the platform, with onboarding status and activity at a glance."
      />

      <AdminStats
        items={[
          { label: "Total", value: summary?.total ?? "—" },
          { label: "Onboarded", value: summary?.onboarding.completed ?? "—" },
          { label: "Not onboarded", value: summary?.onboarding.inProgress ?? "—" },
          { label: "With active classes", value: summary?.withActiveClasses ?? "—" },
        ]}
      />

      <div className="flex flex-wrap items-center gap-3">
        <AdminSearchBox value={search} onChange={setSearch} placeholder="Search by name, email or city" />
      </div>

      <AdminErrorNote>{error}</AdminErrorNote>

      {loading ? <AdminLoadingState message="Loading parents…" /> : <ParentDirectoryTable parents={parents} />}
    </AdminStack>
  );
}
