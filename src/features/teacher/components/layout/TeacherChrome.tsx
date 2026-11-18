"use client";

import { useRouter } from "next/navigation";

import TeacherBottomNav from "@/features/teacher/components/layout/TeacherBottomNav";
import TeacherNavbar from "@/features/teacher/components/layout/TeacherNavbar";
import TeacherSidebar from "@/features/teacher/components/layout/TeacherSidebar";
import { useTeacherRequestCount } from "@/features/teacher/hooks/useTeacherRequestCount";
import { endSession } from "@/features/shared/utils/endSession";
import { logClientActivity } from "@/features/shared/utils/logClientActivity";

/**
 * Top bar + side navigation + mobile bottom navigation. Mounted only once the
 * approval guard has let the teacher in, so the request-count fetches never
 * run for onboarding / pending-approval teachers.
 */
export default function TeacherChrome() {
  const router = useRouter();
  const requestCount = useTeacherRequestCount();

  const handleLogout = async () => {
    // Fire the log before ending the session — the endpoint needs
    // the idToken cookie to identify who's logging out.
    await logClientActivity("LOGOUT");
    await endSession();
    localStorage.removeItem("teacherId");
    router.push("/login");
  };

  const badges = { requests: requestCount.total };

  return (
    <div className="print:hidden">
      <TeacherNavbar onLogout={handleLogout} />
      <TeacherSidebar onLogout={handleLogout} badges={badges} />
      <TeacherBottomNav onLogout={handleLogout} badges={badges} />
    </div>
  );
}
