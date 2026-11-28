"use client";

import { ADMIN_CARD, adminBtn, adminTag } from "@/features/admin/components/ui/adminStyles";
import { AdminEmptyState } from "@/features/admin/components/ui/design";

import type { AdminCommunityPoll } from "../types/community";
import { formatDate } from "../utils/format";

interface Props {
  polls: AdminCommunityPoll[];
  onClose: (poll: AdminCommunityPoll) => void;
  onDelete: (poll: AdminCommunityPoll) => void;
}

function percent(votes: number, voters: number) {
  return voters === 0 ? 0 : Math.round((votes / voters) * 100);
}

/** Admin's poll list for one community: results, who voted (expandable), close and delete. */
export default function AdminCommunityPolls({ polls, onClose, onDelete }: Props) {
  if (polls.length === 0) {
    return (
      <AdminEmptyState
        title="No polls yet"
        message="Post a poll to collect answers from the parents who joined this community."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {polls.map((poll) => (
        <article key={poll.id} className={`${ADMIN_CARD} p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-heading text-[17px] font-semibold text-pd-ink">{poll.question}</h3>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-pd-ink3">
                <span className={adminTag(poll.isClosed ? "gray" : "green")}>{poll.isClosed ? "Closed" : "Open"}</span>
                <span>{poll.allowMultiple ? "Multiple answers" : "Single answer"}</span>
                <span>
                  {poll.voterCount} {poll.voterCount === 1 ? "voter" : "voters"}
                </span>
                <span>Posted {formatDate(poll.createdAt)}</span>
                {poll.closedAt ? (
                  <span>Closed {formatDate(poll.closedAt)}</span>
                ) : poll.closesAt ? (
                  <span>{poll.isClosed ? "Ended" : "Closes"} {formatDate(poll.closesAt)}</span>
                ) : null}
              </p>
            </div>

            <div className="flex gap-2">
              {!poll.isClosed && (
                <button type="button" className={adminBtn("out", "sm")} onClick={() => onClose(poll)}>
                  Close poll
                </button>
              )}
              <button type="button" className={adminBtn("dtx", "sm")} onClick={() => onDelete(poll)}>
                Delete
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {poll.options.map((o) => {
              const pct = percent(o.votes, poll.voterCount);

              return (
                <div key={o.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-pd-ink">{o.text}</span>
                    <span className="shrink-0 text-xs font-semibold text-pd-ink3">
                      {o.votes} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-pd-b50">
                    <div className="h-full rounded-full bg-pd-brand" style={{ width: `${pct}%` }} />
                  </div>

                  {o.voters.length > 0 && (
                    <details className="mt-1.5 text-xs text-pd-ink2">
                      <summary className="cursor-pointer font-semibold text-pd-brand">Who voted</summary>
                      <ul className="mt-1 flex flex-col gap-0.5 pl-1">
                        {o.voters.map((v) => (
                          <li key={v.parentId}>
                            <span className="font-semibold text-pd-ink">{v.name}</span>{" "}
                            <span className="break-all text-pd-ink3">{v.email}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}
