"use client";

import { useMemo, useState } from "react";

import AdminChatRoomList from "@/features/admin/components/AdminChatRoomList";
import {
  AdminEmptyState,
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminSearchBox,
  AdminStack,
} from "@/features/admin/components/ui/design";
import { useChatRooms } from "@/features/chat/hooks/useChatRooms";
import { displayName } from "@/features/chat/types/chat";

export default function AdminChatPage() {
  // Data: GET /api/admin/chat (verified Admin auth, live refresh). Read-only:
  // the conversation page has no send route for Admin.
  const { rooms, loading, error } = useChatRooms("/api/admin/chat");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rooms;

    return rooms.filter((room) =>
      [
        displayName(room.parent),
        displayName(room.teacher),
        displayName(room.student),
        room.course.courseTitle ?? "",
        room.lastMessagePreview ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [rooms, search]);

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Classes and safety" }]}
        title="Chat monitor"
        description="View any parent ↔ teacher conversation. Read-only: Admin can oversee messages but not send as either party."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminSearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search by parent, teacher, child or course"
        />
      </div>

      <AdminErrorNote>{error}</AdminErrorNote>

      {loading ? (
        <AdminLoadingState message="Loading conversations…" />
      ) : filtered.length === 0 ? (
        !error && (
          <AdminEmptyState
            message={search ? "No conversations match that search." : "No conversations exist yet."}
          />
        )
      ) : (
        <AdminChatRoomList rooms={filtered} />
      )}
    </AdminStack>
  );
}
