"use client";

import { useState } from "react";
import { UsersRound } from "lucide-react";

import ErrorBanner from "@/features/shared/components/ErrorBanner";
import { PD_BTN_SEC_SM, PdEmpty } from "@/features/parent/components/courses/pdUi";
import { useTeacherClasses } from "@/features/teacher/hooks/useMyClasses";
import GroupWorkspace from "./GroupWorkspace";
import { TD_CARD } from "./TeacherUi";

/**
 * My classes > Group classes: each group with a "Manage" action that opens
 * its homework (sent to everyone), announcements and private chats.
 */
export default function GroupClassesTab() {
  const { classes: all, loading, error } = useTeacherClasses();
  const [openId, setOpenId] = useState<string | null>(null);
  const groups = all.filter((c) => c.isGroup);

  if (openId) {
    return <GroupWorkspace courseId={openId} onBack={() => setOpenId(null)} />;
  }

  return (
    <div className="mt-5">
      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <div aria-busy="true" aria-label="Loading" className="h-[160px] animate-pulse rounded-2xl bg-[#eeeaf7]" />
      ) : groups.length === 0 ? (
        <div className={TD_CARD}>
          <PdEmpty
            icon={UsersRound}
            title="No group classes yet"
            text="Group courses with enrolled students appear here."
          />
        </div>
      ) : (
        <div className={TD_CARD}>
          {groups.map((c) => (
            <div
              key={c.courseId}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-pd-line px-[18px] py-3.5 first:border-t-0"
            >
              <div className="min-w-0">
                <b className="block truncate text-[15px] font-semibold text-pd-ink">
                  {c.courseTitle ?? "Untitled course"}
                </b>
                <small className="text-[13px] text-pd-ink3">
                  {c.groupMaxStudents
                    ? `${c.activeStudentCount} of ${c.groupMaxStudents} seats filled`
                    : `${c.activeStudentCount} active`}
                  {" · "}
                  {c.studentCount} total
                </small>
              </div>
              <button type="button" className={PD_BTN_SEC_SM} onClick={() => setOpenId(c.courseId)}>
                Homework, announcements &amp; chat
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
