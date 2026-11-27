"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { PD_BTN_PRI } from "@/features/parent/components/courses/pdUi";
import { useParentEnrollments } from "@/features/parent/hooks/useEnrollments";
import MyClassesView from "@/features/parent/components/views/MyClassesView";

/** Parent → Group classes: the group classes the children are enrolled in. */
export default function ParentGroupClassesPage() {
  const { enrollments, loading, error, respondToRevision } = useParentEnrollments(
    "/api/parent/my-classes",
  );

  return (
    <Suspense fallback={null}>
      <div className="mx-auto max-w-[1160px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-[26px] font-semibold leading-[1.15] text-pd-ink outline-none sm:text-[32px]">
              Group classes
            </h1>
            <p className="text-sm text-pd-ink3">
              Group classes your children have joined: join links, progress and homework.
            </p>
          </div>
          <Link href="/parent/courses?type=group" className={PD_BTN_PRI}>
            <Search size={16} />
            Find a group class
          </Link>
        </header>

        <MyClassesView
          groupOnly
          enrollments={enrollments}
          loading={loading}
          error={error}
          onConfirmRevision={(id) => respondToRevision(id, "CONFIRM")}
          onDeclineRevision={(id) => respondToRevision(id, "DECLINE")}
        />
      </div>
    </Suspense>
  );
}
