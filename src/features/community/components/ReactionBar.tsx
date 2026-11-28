"use client";

import { useState } from "react";

import {
  COMMUNITY_REACTIONS,
  type CommunityReactionCounts,
  type CommunityReactionType,
} from "../types/community";

interface Props {
  counts: CommunityReactionCounts;
  mine: CommunityReactionType | null;
  /** `null` removes the Parent's reaction. Resolves with an error message, or null when saved. */
  onReact: (type: CommunityReactionType | null) => Promise<string | null>;
}

/**
 * The few emojis a Parent can react with. Tapping one picks it, tapping the
 * picked one again removes it; only one reaction per file per Parent.
 */
export default function ReactionBar({ counts, mine, onReact }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function tap(type: CommunityReactionType) {
    if (busy) return;

    setBusy(true);
    setError("");

    const message = await onReact(mine === type ? null : type);

    if (message) setError(message);

    setBusy(false);
  }

  return (
    <div>
      <div role="group" aria-label="React to this file" className="flex flex-wrap gap-1.5">
        {COMMUNITY_REACTIONS.map(({ type, emoji, label }) => {
          const active = mine === type;
          const count = counts[type];

          return (
            <button
              key={type}
              type="button"
              disabled={busy}
              aria-pressed={active}
              aria-label={`${label}${count ? `, ${count}` : ""}`}
              title={label}
              onClick={() => void tap(type)}
              className={`inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-[13px] font-semibold transition disabled:opacity-60 ${
                active
                  ? "border-pd-brand bg-pd-b50 text-pd-brand-d"
                  : "border-pd-line bg-white text-pd-ink2 hover:bg-pd-b50"
              }`}
            >
              <span aria-hidden>{emoji}</span>
              {count > 0 && <span>{count}</span>}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-1.5 text-xs font-bold text-pd-red">{error}</p>}
    </div>
  );
}
