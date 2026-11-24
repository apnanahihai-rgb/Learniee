"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import AdminBottomNav from "@/features/admin/components/ui/AdminBottomNav";
import { AdminCountsContext } from "@/features/admin/components/ui/AdminCountsContext";
import { AdminIdentityContext } from "@/features/admin/components/ui/AdminIdentityContext";
import AdminMoreSheet from "@/features/admin/components/ui/AdminMoreSheet";
import AdminNav from "@/features/admin/components/ui/AdminNav";
import AdminTopBar from "@/features/admin/components/ui/AdminTopBar";
import { adminGroupOf } from "@/features/admin/config/adminNav";
import { useAdminIdentityLoader } from "@/features/admin/hooks/useAdminIdentity";
import { useAdminQueueCounts } from "@/features/admin/hooks/useAdminQueueCounts";

/**
 * Shared Admin chrome (Admin redesign from the HTML designs, Nov 2026):
 * 60px top bar, 260px sidebar with collapsible groups from 1024px up,
 * bottom bar + "All screens" sheet below that. Mounted once by
 * `src/app/admin/layout.tsx`, so Admin pages render only their content.
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const queue = useAdminQueueCounts();
  const identity = useAdminIdentityLoader();
  const pathname = usePathname();

  const [openGroups, setOpenGroups] = useState<ReadonlySet<string>>(() => {
    const group = adminGroupOf(pathname);

    return new Set(group ? [group] : []);
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);

  // On every page change: open that page's group (others stay as they are)
  // and close the sheet. Done while rendering, so there is no flash.
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setSheetOpen(false);

    const group = adminGroupOf(pathname);

    if (group && !openGroups.has(group)) setOpenGroups(new Set(openGroups).add(group));
  }

  function toggleGroup(label: string) {
    setOpenGroups((current) => {
      const next = new Set(current);

      if (!next.delete(label)) next.add(label);

      return next;
    });
  }

  return (
    <AdminCountsContext.Provider value={queue}>
      <AdminIdentityContext.Provider value={identity}>
      <div className="min-h-dvh bg-pd-bg font-sans text-[14px] leading-[1.55] text-pd-ink antialiased">
        <a
          href="#view"
          className="absolute -top-16 left-3 z-[200] rounded-full bg-pd-brand px-4 py-2 font-bold text-white focus:top-3"
        >
          Skip to content
        </a>

        <AdminTopBar />

        <aside className="fixed bottom-0 left-0 top-[60px] z-40 hidden w-[260px] overflow-y-auto border-r border-pd-line bg-white px-3 pb-6 pt-2 lg:block">
          <AdminNav
            pathname={pathname}
            counts={queue.counts}
            openGroups={openGroups}
            onToggleGroup={toggleGroup}
          />
        </aside>

        <AdminBottomNav
          pathname={pathname}
          counts={queue.counts}
          onOpenMore={() => setSheetOpen(true)}
        />
        <AdminMoreSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          pathname={pathname}
          counts={queue.counts}
          openGroups={openGroups}
          onToggleGroup={toggleGroup}
        />

        <main className="pt-[60px] lg:pl-[260px]">
          <div
            id="view"
            tabIndex={-1}
            className="mx-auto max-w-[1160px] px-4 pb-[120px] pt-6 outline-none sm:px-6 sm:pt-8 lg:pb-12"
          >
            {children}
          </div>
        </main>
      </div>
      </AdminIdentityContext.Provider>
    </AdminCountsContext.Provider>
  );
}
