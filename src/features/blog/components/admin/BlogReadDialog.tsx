"use client";

import { useEffect, useState } from "react";

import "@/features/landing/styles/landing.css";

import { adminBtn, adminTag } from "@/features/admin/components/ui/adminStyles";
import { AdminErrorNote, AdminLoadingState } from "@/features/admin/components/ui/design";
import PdDialog from "@/features/shared/components/PdDialog";
import { displayName } from "@/features/shared/utils/displayName";
import { fetchAdminBlogPost } from "../../hooks/useAdminBlogs";
import type { AdminBlogPost } from "../../types";
import { blogCategoryLabel } from "../../utils/blogCategories";
import { countWords } from "../../utils/blogRules";
import BlogContent from "../BlogContent";

/**
 * "Read post": loads the full article (GET /api/admin/blogs/[id]) and shows
 * it as the public blog would. Read-only; decisions stay on the card.
 * Mount it only while open: `{postId && <BlogReadDialog … />}`.
 */
export default function BlogReadDialog({
  postId,
  onClose,
}: {
  postId: string;
  onClose: () => void;
}) {
  const [post, setPost] = useState<AdminBlogPost | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void fetchAdminBlogPost(postId).then((result) => {
      if (cancelled) return;

      if (result.ok) setPost(result.data.post);
      else setError(result.error);
    });

    return () => {
      cancelled = true;
    };
  }, [postId]);

  return (
    <PdDialog
      wide
      title={post?.title ?? "Read post"}
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className={adminBtn("sec")}>
          Close
        </button>
      }
    >
      <AdminErrorNote>{error}</AdminErrorNote>

      {!post && !error && <AdminLoadingState message="Loading the post…" />}

      {post && (
        <>
          <p className="text-[13px] text-pd-ink3">
            By {displayName(post.teacher)} ({post.teacher.email}) · {blogCategoryLabel(post.category)} ·{" "}
            {countWords(post.content)} words · /blog/{post.slug}
          </p>

          <p className="text-[14px] text-pd-ink2">{post.excerpt}</p>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span key={tag} className={adminTag("violet")}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="lh max-h-[55vh] overflow-y-auto rounded-xl border border-pd-line p-5">
            <BlogContent markdown={post.content} />
          </div>
        </>
      )}
    </PdDialog>
  );
}
