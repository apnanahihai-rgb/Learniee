import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { ChatRoomSummary } from "@/features/chat/types/chat";
import { displayName } from "@/features/chat/types/chat";
import { AdminInitials } from "@/features/admin/components/ui/design";
import { ADMIN_CARD_FLUSH, adminTag, cx } from "@/features/admin/components/ui/adminStyles";

function formatWhen(value: string | null) {
  if (!value) return "No messages yet";

  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 864e5);

  if (days < 1) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (days < 2) return "Yesterday";

  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Chat monitor rows (design 11): avatar, "Parent ↔ Teacher", course · child, last message, time. */
export default function AdminChatRoomList({
  rooms,
  basePath = "/admin/chat",
}: {
  rooms: ChatRoomSummary[];
  basePath?: string;
}) {
  return (
    <div className={ADMIN_CARD_FLUSH}>
      {rooms.map((room, index) => {
        const parent = displayName(room.parent);
        const teacher = displayName(room.teacher);

        return (
          <Link
            key={room.id}
            href={`${basePath}/${room.id}`}
            className={cx(
              "flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-pd-b50",
              index > 0 && "border-t border-pd-line",
            )}
          >
            <AdminInitials name={parent} />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[15px] font-semibold">
                {parent} ↔ {teacher}
              </b>
              <small className="block truncate text-[13px] text-pd-ink3">
                {room.course.courseTitle ?? "Untitled course"} · {displayName(room.student)}
              </small>
              <small className="block truncate text-[13px] text-pd-ink2">
                {room.lastMessagePreview ?? "No messages yet"}
              </small>
            </span>
            {room.hasFlaggedMessages && <span className={adminTag("amber")}>Flagged</span>}
            <span className="shrink-0 text-[13px] text-pd-ink3">{formatWhen(room.lastMessageAt)}</span>
            <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-pd-ink3" />
          </Link>
        );
      })}
    </div>
  );
}
