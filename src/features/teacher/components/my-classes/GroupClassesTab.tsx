"use client";

import { useState } from "react";

import ClassesTab from "./ClassesTab";
import GroupWorkspace from "./GroupWorkspace";

/**
 * My classes > Group classes: the normal class rows (course page with Start /
 * Join lecture, Students) plus a "Homework & announcements" button that opens
 * the group's homework, announcements and private chats.
 */
export default function GroupClassesTab() {
  const [openId, setOpenId] = useState<string | null>(null);

  if (openId) {
    return <GroupWorkspace courseId={openId} onBack={() => setOpenId(null)} />;
  }

  return <ClassesTab groupOnly onManageGroup={setOpenId} />;
}
