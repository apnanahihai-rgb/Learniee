"use client";

import { useMemo, useState } from "react";

import { useChatRooms } from "@/features/chat/hooks/useChatRooms";
import { displayName } from "@/features/chat/types/chat";
import ChatRoomList from "@/features/chat/components/ChatRoomList";

export default function AdminChatPage() {
  const { rooms, loading, error } = useChatRooms("/api/admin/chat");
  const [search, setSearch] = useState("");

  // Client-side search over the already-loaded room list — the
  // `/api/admin/chat` route also accepts teacherId/parentId/courseId
  // query params for programmatic filtering (e.g. a future "view
  // this teacher's chats" link from /admin/teachers), but a free-text
  // name search is what's actually useful from this page directly.
  const filteredRooms = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rooms;

    return rooms.filter((room) => {
      const haystack = [
        displayName(room.parent),
        displayName(room.teacher),
        displayName(room.student),
        room.course.courseTitle ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [rooms, search]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-purple-600">Chat Monitor</h1>
          <p className="text-gray-500 mt-1">
            View any parent ↔ teacher conversation on the platform. Read-only —
            Admin can oversee messages but not send as either party.
          </p>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by parent, teacher, child, or course…"
          className="w-full mb-6 border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
        />

        <ChatRoomList
          rooms={filteredRooms}
          loading={loading}
          error={error}
          viewerRole="admin"
          basePath="/admin/chat"
          emptyMessage={
            search
              ? "No conversations match that search."
              : "No conversations exist yet."
          }
        />
      </div>
    </div>
  );
}
