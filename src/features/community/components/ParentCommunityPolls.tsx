"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";

import { PD_BTN_PRI_SM, PD_BTN_SEC_SM, PdEmpty } from "@/features/parent/components/courses/pdUi";

import type { ParentCommunityPoll } from "../types/community";
import { formatDate } from "../utils/format";

interface Props {
  polls: ParentCommunityPoll[];
  /** Resolves with an error message, or null when the vote was saved. */
  onVote: (pollId: string, optionIds: string[]) => Promise<string | null>;
}

function percent(votes: number, voters: number) {
  return voters === 0 ? 0 : Math.round((votes / voters) * 100);
}

function PollCard({ poll, onVote }: { poll: ParentCommunityPoll; onVote: Props["onVote"] }) {
  const hasVoted = poll.myOptionIds.length > 0;
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>(poll.myOptionIds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const choosing = !poll.isClosed && (!hasVoted || editing);

  function toggle(optionId: string) {
    setSelected((current) =>
      poll.allowMultiple
        ? current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId]
        : [optionId],
    );
  }

  async function submit() {
    if (selected.length === 0) return setError("Choose an option first.");

    setBusy(true);
    setError("");

    const message = await onVote(poll.id, selected);

    if (message) setError(message);
    else setEditing(false);

    setBusy(false);
  }

  return (
    <li className="border-t border-pd-line px-[18px] py-4 first:border-t-0">
      <div className="flex flex-wrap items-center gap-2">
        <b className="text-[15px] font-semibold text-pd-ink">{poll.question}</b>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
            poll.isClosed ? "bg-pd-bg text-pd-ink2" : "bg-[#e7f6ee] text-[#1b7a4b]"
          }`}
        >
          {poll.isClosed ? "Closed" : "Open"}
        </span>
      </div>

      <p className="mt-0.5 text-xs text-pd-ink3">
        {poll.allowMultiple ? "Pick any that apply" : "Pick one"} · Posted {formatDate(poll.createdAt)}
        {poll.closesAt && !poll.isClosed ? ` · Closes ${formatDate(poll.closesAt)}` : ""}
      </p>

      {choosing ? (
        <fieldset className="mt-3 flex flex-col gap-2" disabled={busy}>
          <legend className="sr-only">{poll.question}</legend>

          {poll.options.map((o) => (
            <label
              key={o.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-pd-line px-3.5 py-2.5 text-sm text-pd-ink has-[:checked]:border-pd-brand has-[:checked]:bg-pd-b50"
            >
              <input
                type={poll.allowMultiple ? "checkbox" : "radio"}
                name={`poll-${poll.id}`}
                checked={selected.includes(o.id)}
                onChange={() => toggle(o.id)}
                className="size-4"
              />
              {o.text}
            </label>
          ))}

          {error && <p className="text-xs font-bold text-pd-red">{error}</p>}

          <div className="flex gap-2">
            <button type="button" className={PD_BTN_PRI_SM} disabled={busy} onClick={() => void submit()}>
              {busy ? "Saving…" : hasVoted ? "Save vote" : "Vote"}
            </button>
            {editing && (
              <button
                type="button"
                className={PD_BTN_SEC_SM}
                disabled={busy}
                onClick={() => {
                  setEditing(false);
                  setSelected(poll.myOptionIds);
                  setError("");
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </fieldset>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {poll.options.map((o) => {
            const pct = percent(o.votes, poll.voterCount);
            const mine = poll.myOptionIds.includes(o.id);

            return (
              <div key={o.id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className={mine ? "font-semibold text-pd-brand-d" : "text-pd-ink"}>
                    {o.text}
                    {mine ? " · your vote" : ""}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-pd-ink3">
                    {o.votes} · {pct}%
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-pd-b50">
                  <div
                    className={`h-full rounded-full ${mine ? "bg-pd-brand" : "bg-pd-b100"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}

          {error && <p className="text-xs font-bold text-pd-red">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <small className="text-xs text-pd-ink3">
              {poll.voterCount} {poll.voterCount === 1 ? "parent has" : "parents have"} voted
            </small>
            {hasVoted && !poll.isClosed && (
              <button type="button" className={PD_BTN_SEC_SM} onClick={() => setEditing(true)}>
                Change vote
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/** A community's polls for a member: vote while open, see the counts, change the vote until it closes. */
export default function ParentCommunityPolls({ polls, onVote }: Props) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-pd-line bg-white">
      <div className="flex items-center gap-2 border-b border-pd-line px-[18px] py-3">
        <BarChart3 size={18} className="text-pd-brand" />
        <h2 className="font-heading text-base font-semibold text-pd-ink">Polls</h2>
      </div>

      {polls.length === 0 ? (
        <PdEmpty
          icon={BarChart3}
          title="No polls yet"
          text="When the community team posts a poll you will get a notification."
        />
      ) : (
        <>
          <ul>
            {polls.map((p) => (
              <PollCard key={p.id} poll={p} onVote={onVote} />
            ))}
          </ul>
          <p className="border-t border-pd-line px-[18px] py-2.5 text-xs text-pd-ink3">
            Other parents see only the totals. The community team can see who voted.
          </p>
        </>
      )}
    </section>
  );
}
