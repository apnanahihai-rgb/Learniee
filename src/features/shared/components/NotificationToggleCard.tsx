"use client";

import { Bell } from "lucide-react";

/**
 * Shared between `/parent/settings` and `/teacher/settings`.
 * MVP-minimal on purpose — one master switch for the whole in-app
 * notification feed, not per-category toggles. The fuller
 * bucketed/subscribe-unsubscribe version is still Phase 2, see
 * 06-OPEN-DECISIONS.md #32.
 */
export default function NotificationToggleCard({
  enabled,
  saving,
  onToggle,
}: {
  enabled: boolean;
  saving: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <div className="bg-white border rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <Bell size={16} className="text-violet-700" />
        <h2 className="text-sm font-semibold text-gray-800">Notifications</h2>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Controls the in-app notification bell — enrollment updates, class reminders, chat
        messages, and everything else it currently covers. Turning this off stops new
        notifications from being created; it won't clear ones you already have.
      </p>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-800">In-app notifications</p>
          <p className="text-xs text-gray-500">{enabled ? "On" : "Off"}</p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle in-app notifications"
          disabled={saving}
          onClick={() => onToggle(!enabled)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
            enabled ? "bg-violet-700" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
