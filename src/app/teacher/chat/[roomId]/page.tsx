"use client";

import { use } from "react";

import { useChatRooms } from "@/features/chat/hooks/useChatRooms";
import { useChatMessages } from "@/features/chat/hooks/useChatMessages";
import { displayName } from "@/features/chat/types/chat";
import ChatWindow from "@/features/chat/components/ChatWindow";

const SENDABLE_STATUSES = new Set(["PENDING_APPROVAL", "APPROVED", "ACTIVE", "LAPSED"]);

export default function TeacherChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);

  const { rooms } = useChatRooms("/api/teacher/chat");
  const room = rooms.find((r) => r.id === roomId);

  const { messages, loading, error, sending, sendMessage } = useChatMessages(
    `/api/teacher/chat/${roomId}/messages`,
    true,
  );

  const canSend = !room || SENDABLE_STATUSES.has(room.enrollment.status);

  return (
    <ChatWindow
      headerTitle={room ? displayName(room.parent) : "Conversation"}
      headerSubtitle={
        room
          ? `${room.course.courseTitle ?? "Untitled course"} · ${displayName(room.student)}`
          : undefined
      }
      backPath="/teacher/chat"
      messages={messages}
      loading={loading}
      error={error}
      sending={sending}
      viewerSenderRole="TEACHER"
      canSend={canSend}
      onSend={sendMessage}
      disabledReason={
        canSend
          ? undefined
          : "This enrollment was rejected or cancelled, so messaging is closed."
      }
    />
  );
}
