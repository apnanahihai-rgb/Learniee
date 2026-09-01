"use client";

import { useChatRooms } from "@/features/chat/hooks/useChatRooms";
import ChatRoomList from "@/features/chat/components/ChatRoomList";

export default function TeacherChatPage() {
  const { rooms, loading, error } = useChatRooms("/api/teacher/chat");

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-purple-600">Chat</h1>
        <p className="text-gray-500 mt-1">
          One conversation per enrolled child — message their parent directly.
        </p>
      </div>

      <ChatRoomList
        rooms={rooms}
        loading={loading}
        error={error}
        viewerRole="teacher"
        basePath="/teacher/chat"
        emptyMessage="No conversations yet — they'll appear once a parent enrolls in one of your courses."
      />
    </div>
  );
}
