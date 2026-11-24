"use client";

import DashboardActivity from "@/features/admin/components/DashboardActivity";
import {
  OtherQueues,
  OverviewHeading,
  OverviewHero,
  PriorityQueues,
} from "@/features/admin/components/overview/OverviewSections";
import { useAdminCounts } from "@/features/admin/components/ui/AdminCountsContext";

/**
 * Admin Overview (HTML design 01). Queue numbers come from the shell's
 * live counts; the activity list reads the Activity Log.
 */
export default function AdminDashboard() {
  const { counts } = useAdminCounts();

  return (
    <div className="flex flex-col gap-6">
      <OverviewHeading counts={counts} />
      <OverviewHero counts={counts} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <PriorityQueues counts={counts} />
          <OtherQueues counts={counts} />
        </div>
        <aside className="flex min-w-0 flex-col gap-6">
          <DashboardActivity />
        </aside>
      </div>
    </div>
  );
}
