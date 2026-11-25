"use client";

import { Modal } from "@/components/ui/modal";
import { useAdminUserDetail } from "@/features/admin/hooks/useAdminUserDetail";
import {
  formatDetailLabel,
  formatDetailValue,
  isDisplayableEntry,
  splitDetailEntries,
} from "@/features/admin/utils/userDetailFormatting";
import type { AdminUser } from "@/features/admin/types/user";

interface UserDetailPanelProps {
  email: string;
  role: AdminUser["role"];
  onClose: () => void;
}

export default function UserDetailPanel({ email, role, onClose }: UserDetailPanelProps) {
  const { detail, loading, error } = useAdminUserDetail(email, role);
  const { flatEntries, arrayEntries, objectEntries } = splitDetailEntries(detail);

  return (
    // Shared Modal (side panel): Escape closes it, focus is trapped, and the panel slides in instead of popping.
    <Modal
      variant="right"
      label="User details"
      onClose={onClose}
      backdropClassName="bg-[rgba(28,24,51,0.5)]"
      panelClassName="max-w-md bg-white text-pd-ink shadow-[0_16px_40px_-12px_rgba(23,23,43,0.35)]"
    >
      <div className="flex items-center justify-between border-b border-pd-line px-6 py-4 sticky top-0 bg-white">
        <h2 className="font-heading text-xl font-semibold">User details</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-11 place-items-center rounded-[10px] text-2xl leading-none text-pd-ink2 transition-colors hover:bg-pd-b50 hover:text-pd-brand"
        >
          ×
        </button>
      </div>

      <div className="p-6">
        {loading && <p className="text-pd-ink3">Loading…</p>}
        {error && <p className="rounded-xl border border-[#efcdca] bg-pd-red-bg px-4 py-3 text-sm font-semibold text-pd-red">{error}</p>}

        {detail && (
          <div className="space-y-6">
            <div className="space-y-3">
              {flatEntries.map(([key, value]) => (
                <div key={key}>
                  <div className="text-xs font-semibold text-pd-ink3">
                    {formatDetailLabel(key)}
                  </div>
                  <div className="text-[14px] font-semibold">{formatDetailValue(value)}</div>
                </div>
              ))}
            </div>

            {arrayEntries.map(([key, value]) => (
              <div key={key}>
                <h3 className="font-heading text-[16px] font-semibold mb-2">
                  {formatDetailLabel(key)}
                </h3>
                <div className="space-y-3">
                  {(value as Record<string, unknown>[]).map((item, i) => (
                    <div key={i} className="border border-pd-line rounded-xl p-3 bg-pd-bg space-y-1">
                      {Object.entries(item)
                        .filter(isDisplayableEntry)
                        .map(([k, v]) => (
                          <div key={k} className="text-xs">
                            <span className="text-pd-ink3">{formatDetailLabel(k)}: </span>
                            <span className="text-pd-ink">{formatDetailValue(v)}</span>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {objectEntries.map(([key, value]) => (
              <div key={key}>
                <h3 className="font-heading text-[16px] font-semibold mb-2">
                  {formatDetailLabel(key)}
                </h3>
                <div className="border border-pd-line rounded-xl p-3 bg-pd-bg space-y-1">
                  {Object.entries(value as Record<string, unknown>)
                    .filter(isDisplayableEntry)
                    .map(([k, v]) => (
                      <div key={k} className="text-xs">
                        <span className="text-pd-ink3">{formatDetailLabel(k)}: </span>
                        <span className="text-pd-ink">{formatDetailValue(v)}</span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
