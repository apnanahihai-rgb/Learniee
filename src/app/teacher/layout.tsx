"use client";

import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

import AvailabilityGate from "@/features/teacher/components/availability/AvailabilityGate";
import TeacherChrome from "@/features/teacher/components/layout/TeacherChrome";
import { useTeacherAccessGuard } from "@/features/teacher/hooks/useTeacherAccessGuard";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Onboarding and the "waiting for approval" page happen before the teacher
  // has a dashboard, so they render without the Navbar/Sidebar (each has its
  // own layout/page chrome) and are exempt from the approval guard below.
  const isChromeFree =
    pathname?.startsWith("/teacher/onboarding") ||
    pathname?.startsWith("/teacher/pending-approval");

  // Every other /teacher/* page needs an approved application. Unfinished or
  // unapproved teachers are redirected (see useTeacherAccessGuard).
  const guard = useTeacherAccessGuard(!isChromeFree, pathname ?? null);

  if (isChromeFree) {
    return <>{children}</>;
  }

  if (guard.status !== "allowed") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-gray-50 px-4 text-center">
        {guard.status === "error" ? (
          <>
            <p className="text-sm text-red-600">
              We couldn&apos;t verify your account. Please try again.
            </p>
            <button
              onClick={guard.retry}
              className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              Retry
            </button>
          </>
        ) : (
          <>
            <Loader2 className="size-6 animate-spin text-violet-600" />
            <p className="text-sm text-gray-500">Checking your account...</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-pd-bg text-pd-ink print:bg-white">
      {/* Top bar, side navigation (desktop) and bottom navigation (phone / tablet) */}
      <TeacherChrome />

      {/* Page Content */}
      <main className="min-h-dvh pt-[60px] pb-16 lg:pl-60 lg:pb-0 print:p-0">
        {children}
      </main>

      {/* Approved teachers without weekly availability get a set-up popup */}
      <AvailabilityGate />
    </div>
  );
}
