"use client";

import { useState } from "react";

import AdminReasonDialog from "@/features/admin/components/ui/AdminReasonDialog";
import {
  AdminEmptyState,
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminPillTabs,
  AdminStack,
} from "@/features/admin/components/ui/design";
import { AdminQueue, type AdminQueueItem } from "@/features/admin/components/ui/queue";
import { displayName } from "@/features/shared/utils/displayName";

import { decideBlogPost, useAdminBlogList } from "../hooks/useAdminBlogs";
import type { BlogPostStatus } from "../types";
import { blogCategoryLabel } from "../utils/blogCategories";
import BlogReadDialog from "./admin/BlogReadDialog";
import BlogReviewCard, { type AdminBlogRow } from "./admin/BlogReviewCard";

const TABS: { value: BlogPostStatus; label: string }[] = [
  { value: "PENDING_REVIEW", label: "Awaiting review" },
  { value: "PUBLISHED", label: "Published" },
  { value: "REJECTED", label: "Rejected" },
];

const EMPTY: Record<string, string> = {
  PENDING_REVIEW: "No posts are waiting for your review.",
  PUBLISHED: "No posts have been published yet.",
  REJECTED: "No posts have been rejected.",
};

/**
 * Admin "Blog posts" (design 06). Teacher posts go live on the public blog
 * only after approval. Data: GET /api/admin/blogs?status=, one post with its
 * body: GET /api/admin/blogs/[id], decisions: POST
 * /api/admin/blogs/[id]/decision (verified Admin auth). Rejecting or taking
 * a live post down needs a 5 to 500 character reason, shown to the teacher.
 */
export default function AdminBlogReview() {
  const [tab, setTab] = useState<BlogPostStatus>("PENDING_REVIEW");
  const { posts: loaded, loading, error, reload } = useAdminBlogList(tab);

  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [readId, setReadId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<AdminBlogRow | null>(null);

  // The list can still hold the previous tab's posts for one render after a
  // tab change; never show those with this tab's actions.
  const posts = loaded.filter((post) => post.status === tab);

  async function approve(postId: string) {
    setBusyId(postId);
    setActionError("");

    const result = await decideBlogPost(postId, "approve");

    if (!result.ok) setActionError(result.error);
    else await reload();

    setBusyId(null);
  }

  async function reject(post: AdminBlogRow, reason: string): Promise<string | null> {
    const result = await decideBlogPost(post.id, "reject", reason);

    if (!result.ok) return result.error;

    setRejecting(null);
    await reload();

    return null;
  }

  const queueItems: AdminQueueItem[] = posts.map((post) => ({
    id: post.id,
    group: blogCategoryLabel(post.category),
    date: post.submittedAt,
    searchText: [
      post.title,
      displayName(post.teacher),
      post.teacher.email,
      blogCategoryLabel(post.category),
      post.excerpt,
    ].join(" "),
    render: ({ open, onToggle, waitingTag }) => (
      <BlogReviewCard
        post={post}
        open={open}
        onToggle={onToggle}
        waitingTag={waitingTag}
        busy={busyId === post.id}
        onRead={setReadId}
        onApprove={(id) => void approve(id)}
        onReject={setRejecting}
      />
    ),
  }));

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }, { label: "Approvals" }]}
        title="Blog posts"
        description="Teacher-written posts go live on the public blog only after you approve them."
      />

      <AdminPillTabs
        label="Post status"
        value={tab}
        onChange={(next) => {
          setTab(next);
          setOpenId(null);
          setActionError("");
        }}
        tabs={TABS}
      />

      <AdminErrorNote>{error || actionError}</AdminErrorNote>

      {loading ? (
        <AdminLoadingState message="Loading blog posts…" />
      ) : posts.length === 0 ? (
        <AdminEmptyState message={EMPTY[tab]} />
      ) : tab === "PENDING_REVIEW" ? (
        <AdminQueue items={queueItems} searchPlaceholder="Filter by title, teacher or category" />
      ) : (
        <div className="flex flex-col gap-2.5">
          {posts.map((post) => (
            <BlogReviewCard
              key={post.id}
              post={post}
              open={openId === post.id}
              onToggle={() => setOpenId(openId === post.id ? null : post.id)}
              busy={busyId === post.id}
              onRead={setReadId}
              onApprove={(id) => void approve(id)}
              onReject={setRejecting}
            />
          ))}
        </div>
      )}

      {readId && <BlogReadDialog postId={readId} onClose={() => setReadId(null)} />}

      {rejecting && (
        <AdminReasonDialog
          title={rejecting.status === "PUBLISHED" ? "Take down this post" : "Reject this post"}
          description={
            rejecting.status === "PUBLISHED"
              ? `“${rejecting.title}” will leave the public blog and go back to the teacher.`
              : `“${rejecting.title}” goes back to ${displayName(rejecting.teacher)}.`
          }
          confirmLabel={rejecting.status === "PUBLISHED" ? "Take down" : "Reject post"}
          danger
          label="Feedback for the teacher"
          hint="Required, 5 to 500 characters. The teacher will see this."
          onCancel={() => setRejecting(null)}
          onSubmit={(reason) => reject(rejecting, reason)}
        />
      )}
    </AdminStack>
  );
}
