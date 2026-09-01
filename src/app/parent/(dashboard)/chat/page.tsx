"use client";

import { useChatRooms } from "@/features/chat/hooks/useChatRooms";
import ChatRoomList from "@/features/chat/components/ChatRoomList";

export default function ParentChatPage() {
  const { rooms, loading, error } = useChatRooms("/api/parent/chat");

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-violet-900">Chat</h1>
        <p className="text-gray-500 mt-1">
          Message a teacher directly about your child&apos;s course.
        </p>
      </div>

      <ChatRoomList
        rooms={rooms}
        loading={loading}
        error={error}
        viewerRole="parent"
        basePath="/parent/chat"
        emptyMessage="No conversations yet — enroll in a course to start chatting with a teacher."
      />
    </div>
  );
}
