"use client";

import { useRouter } from "next/navigation";

import type { ChatRoomSummary } from "@/features/chat/types/chat";
import { displayName } from "@/features/chat/types/chat";

const STATUS_STYLES: Record<string, string> = {
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  ACTIVE: "bg-green-100 text-green-700",
  LAPSED: "bg-gray-200 text-gray-600",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function formatTimestamp(value: string | null) {
  if (!value) return "No messages yet";

  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export type ChatViewerRole = "parent" | "teacher" | "admin";

interface ChatRoomListProps {
  rooms: ChatRoomSummary[];
  loading: boolean;
  error: string;
  viewerRole: ChatViewerRole;
  basePath: string;
  emptyMessage?: string;
}

export default function ChatRoomList({
  rooms,
  loading,
  error,
  viewerRole,
  basePath,
  emptyMessage = "No conversations yet.",
}: ChatRoomListProps) {
  const router = useRouter();

  if (loading) {
    return <p className="text-gray-500 p-6">Loading conversations…</p>;
  }

  if (error) {
    return <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>;
  }

  if (rooms.length === 0) {
    return (
      <div className="bg-white border rounded-xl p-8 text-center">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rooms.map((room) => {
        const title =
          viewerRole === "parent"
            ? `${displayName(room.teacher)} — ${room.course.courseTitle ?? "Untitled course"}`
            : viewerRole === "teacher"
              ? `${displayName(room.parent)} — ${room.course.courseTitle ?? "Untitled course"}`
              : `${displayName(room.parent)} ↔ ${displayName(room.teacher)}`;

        const subtitle =
          viewerRole === "admin"
            ? `${room.course.courseTitle ?? "Untitled course"} · ${displayName(room.student)}`
            : `Child: ${displayName(room.student)}`;

        const statusStyle = STATUS_STYLES[room.enrollment.status] ?? "bg-gray-100 text-gray-600";

        return (
          <button
            key={room.id}
            type="button"
            onClick={() => router.push(`${basePath}/${room.id}`)}
            className="w-full text-left bg-white border rounded-xl p-4 hover:border-purple-300 hover:shadow-sm transition flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">{title}</p>
              <p className="text-sm text-gray-500 truncate">{subtitle}</p>
            </div>

            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle}`}>
                {room.enrollment.status.replace("_", " ")}
              </span>
              <span className="text-xs text-gray-400">
                {formatTimestamp(room.lastMessageAt)}
              </span>
              {room._count.messages > 0 && (
                <span className="text-xs text-gray-400">
                  {room._count.messages} message{room._count.messages === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
