"use client";

import type { ReactNode } from "react";

import { adminBtn, adminTag } from "@/features/admin/components/ui/adminStyles";
import {
  AdminDecisionBar,
  AdminGroup,
  AdminReviewCard,
  AdminText,
} from "@/features/admin/components/ui/queue";
import { displayName } from "@/features/shared/utils/displayName";
import type { AdminBlogPost } from "../../types";
import { blogCategoryLabel } from "../../utils/blogCategories";

export type AdminBlogRow = Omit<AdminBlogPost, "content">;

interface Props {
  post: AdminBlogRow;
  open: boolean;
  onToggle: () => void;
  /** "Waiting N days" tag from the queue (awaiting-review posts only). */
  waitingTag?: ReactNode;
  /** True while this post's decision is being saved. */
  busy: boolean;
  onRead: (postId: string) => void;
  onApprove: (postId: string) => void;
  /** Opens the reason dialog (reject, or take down for a live post). */
  onReject: (post: AdminBlogRow) => void;
}

function formatDay(value: string | null) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** One teacher blog post as a collapsible review card (Admin design 06). */
export default function BlogReviewCard({
  post,
  open,
  onToggle,
  waitingTag,
  busy,
  onRead,
  onApprove,
  onReject,
}: Props) {
  const pending = post.status === "PENDING_REVIEW";
  const published = post.status === "PUBLISHED";
  const rejected = post.status === "REJECTED";

  const when = pending
    ? `submitted ${formatDay(post.submittedAt)}`
    : published
      ? `published ${formatDay(post.publishedAt)}`
      : `reviewed ${formatDay(post.reviewedAt ?? post.updatedAt)}`;

  return (
    <AdminReviewCard
      id={`blog-${post.id}`}
      open={open}
      onToggle={onToggle}
      title={post.title}
      meta={`By ${displayName(post.teacher)} · ${blogCategoryLabel(post.category)} · ${post.readingMinutes} min read · ${when}`}
      tags={
        <>
          {pending && waitingTag}
          {pending && <span className={adminTag("amber")}>Awaiting review</span>}
          {published && <span className={adminTag("green")}>Published</span>}
          {rejected && <span className={adminTag("red")}>Rejected</span>}
        </>
      }
      footer={
        <>
          <button type="button" onClick={() => onRead(post.id)} className={adminBtn("out")}>
            Read post
          </button>

          {pending && (
            <AdminDecisionBar>
              <button type="button" disabled={busy} onClick={() => onReject(post)} className={adminBtn("dtx")}>
                Reject
              </button>
              <button type="button" disabled={busy} onClick={() => onApprove(post.id)} className={adminBtn("pri")}>
                {busy ? "Saving…" : "Approve & publish"}
              </button>
            </AdminDecisionBar>
          )}

          {published && (
            <AdminDecisionBar>
              <button type="button" disabled={busy} onClick={() => onReject(post)} className={adminBtn("dtx")}>
                Take down
              </button>
            </AdminDecisionBar>
          )}
        </>
      }
    >
      <AdminText title="Excerpt">{post.excerpt}</AdminText>

      {rejected && post.rejectionReason && (
        <AdminGroup title="Reason given">
          <p className="border-l-[3px] border-pd-b100 py-0.5 pl-3.5 text-[14px] text-pd-ink2">
            {post.rejectionReason}
          </p>
        </AdminGroup>
      )}
    </AdminReviewCard>
  );
}
