"use client";

import Link from "next/link";
import { ArrowLeft, Download, ExternalLink, FileText, Lock } from "lucide-react";

import {
  PD_BTN_SEC_SM,
  PdEmpty,
} from "@/features/parent/components/courses/pdUi";

import { useParentCommunity } from "../hooks/useParentCommunities";
import type { CommunityReactionType, ParentCommunityFile } from "../types/community";
import { formatBytes, formatDate, formatPrice } from "../utils/format";
import ParentCommunityActions from "./ParentCommunityActions";
import ParentCommunityPolls from "./ParentCommunityPolls";
import ReactionBar from "./ReactionBar";

function fileUrl(communityId: string, fileId: string, download: boolean) {
  return `/api/parent/communities/${communityId}/files/${fileId}${download ? "?download=1" : ""}`;
}

function FileRow({
  communityId,
  file,
  onReact,
}: {
  communityId: string;
  file: ParentCommunityFile;
  onReact: (fileId: string, type: CommunityReactionType | null) => Promise<string | null>;
}) {
  const size = formatBytes(file.sizeBytes);

  return (
    <li className="flex flex-wrap items-center gap-3.5 border-t border-pd-line px-[18px] py-3.5 first:border-t-0">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-pd-b50 text-pd-brand">
        <FileText size={20} />
      </span>

      <div className="min-w-0 flex-1 basis-[200px]">
        <b className="block text-[15px] font-semibold text-pd-ink">{file.title}</b>
        <small className="block truncate text-xs text-pd-ink3">
          {file.fileName}
          {size ? ` · ${size}` : ""} · Added {formatDate(file.createdAt)}
        </small>
      </div>

      <div className="flex gap-2 max-[560px]:ml-[58px]">
        <a
          href={fileUrl(communityId, file.id, false)}
          target="_blank"
          rel="noreferrer"
          className={PD_BTN_SEC_SM}
        >
          <ExternalLink size={14} />
          Open
        </a>
        <a href={fileUrl(communityId, file.id, true)} className={PD_BTN_SEC_SM}>
          <Download size={14} />
          Download
        </a>
      </div>

      <div className="basis-full pl-[58px] max-[560px]:pl-0">
        <ReactionBar counts={file.reactionCounts} mine={file.myReaction} onReact={(type) => onReact(file.id, type)} />
      </div>
    </li>
  );
}

/**
 * One community for a Parent. Members see and open/download its files;
 * non-members see the description and a file count only.
 * Data: GET /api/parent/communities/[id]; files via .../files/[fileId].
 */
export default function ParentCommunityDetail({ communityId }: { communityId: string }) {
  const { community, loading, error, join, leave, pay, react, vote } = useParentCommunity(communityId);

  async function onReact(fileId: string, type: CommunityReactionType | null) {
    const result = await react(fileId, type);

    return result.ok ? null : result.error;
  }

  async function onVote(pollId: string, optionIds: string[]) {
    const result = await vote(pollId, optionIds);

    return result.ok ? null : result.error;
  }

  return (
    <div className="mx-auto max-w-[860px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
      <Link
        href="/parent/community"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-pd-brand hover:underline"
      >
        <ArrowLeft size={16} />
        All communities
      </Link>

      {loading && !community ? (
        <div aria-busy="true" aria-label="Loading" className="mt-5 h-[220px] animate-pulse rounded-2xl bg-[#eeeaf7]" />
      ) : !community ? (
        <p className="mt-5 text-sm font-semibold text-pd-red">{error || "Community not found."}</p>
      ) : (
        <>
          <header className="mt-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-[26px] font-semibold leading-[1.15] text-pd-ink sm:text-[32px]">
                {community.title}
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  community.isPaid ? "bg-[#fff4d6] text-[#8a5a00]" : "bg-[#e7f6ee] text-[#1b7a4b]"
                }`}
              >
                {community.isPaid ? `Paid · ${formatPrice(community.price)}` : "Free"}
              </span>
            </div>

            <p className="whitespace-pre-line text-sm text-pd-ink2">{community.description}</p>

            <p className="text-[13px] font-semibold text-pd-ink3">
              {community.fileCount} {community.fileCount === 1 ? "file" : "files"} · {community.memberCount}{" "}
              {community.memberCount === 1 ? "member" : "members"}
            </p>

            <ParentCommunityActions community={community} onJoin={join} onLeave={leave} onPay={pay} showOpen={false} />
          </header>

          <section className="mt-6 overflow-hidden rounded-2xl border border-pd-line bg-white">
            {!community.isMember ? (
              <PdEmpty
                icon={Lock}
                title="Files are for members"
                text={
                  community.isPaid
                    ? `Pay ${formatPrice(community.price)} (plus GST) to join and open its files. You join automatically once the payment goes through.`
                    : "Join this community, it is free, to open and download its files."
                }
              />
            ) : community.files.length === 0 ? (
              <PdEmpty
                icon={FileText}
                title="No files yet"
                text="You will get a notification as soon as a new file is added."
              />
            ) : (
              <ul>
                {community.files.map((f) => (
                  <FileRow key={f.id} communityId={community.id} file={f} onReact={onReact} />
                ))}
              </ul>
            )}
          </section>

          {community.isMember && <ParentCommunityPolls polls={community.polls} onVote={onVote} />}
        </>
      )}
    </div>
  );
}
