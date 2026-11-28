"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import ClassesTab from "./ClassesTab";
import GroupContinueBanner from "./GroupContinueBanner";
import GroupWorkspace from "./GroupWorkspace";

/**
 * Teacher > Group classes page: one row per group course (next class with a
 * Start / Join button), and a group page — classes with their join link,
 * homework, announcements and private chats. `?group=<courseId>` opens a
 * group page directly.
 */
export default function GroupClassesTab() {
  const params = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(params.get("group"));

  if (openId) {
    return <GroupWorkspace courseId={openId} onBack={() => setOpenId(null)} />;
  }

  return (
    <>
      <GroupContinueBanner />
      <ClassesTab groupOnly onManageGroup={setOpenId} />
    </>
  );
}
