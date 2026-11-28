"use client";

import { useRef, useState } from "react";

import AdminConfirmDialog from "@/features/admin/components/ui/AdminConfirmDialog";
import { ADMIN_CARD, adminBtn, adminTag } from "@/features/admin/components/ui/adminStyles";
import {
  AdminDataTable,
  AdminEmptyState,
  AdminErrorNote,
  AdminHead,
  AdminLoadingState,
  AdminPillTabs,
  AdminStack,
  AdminToast,
} from "@/features/admin/components/ui/design";
import { uploadFileToS3 } from "@/lib/uploadFileToS3";

import { useAdminCommunity, type ActionResult } from "../hooks/useAdminCommunities";
import type { AdminCommunityFile, AdminCommunityMember } from "../types/community";
import { formatBytes, formatDate, formatPrice } from "../utils/format";
import CommunityFormDialog from "./CommunityFormDialog";

type Tab = "files" | "members";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Some browsers report no type for .epub files; the upload allow-list needs one. */
function withContentType(file: File): File {
  if (file.type || !file.name.toLowerCase().endsWith(".epub")) return file;

  return new File([file], file.name, { type: "application/epub+zip" });
}

/**
 * One community for Admin: edit, hide / show, add and delete files, see and
 * remove members. Data: /api/admin/communities/[id] (+ /files, /members),
 * all verified Admin auth. Files go browser -> S3 through /api/upload/presign.
 */
export default function AdminCommunityDetail({ communityId }: { communityId: string }) {
  const { community, members, loading, error, edit, setStatus, addFile, deleteFile, removeMember } =
    useAdminCommunity(communityId);

  const [tab, setTab] = useState<Tab>("files");
  const [editing, setEditing] = useState(false);
  const [deletingFile, setDeletingFile] = useState<AdminCommunityFile | null>(null);
  const [removing, setRemoving] = useState<AdminCommunityMember | null>(null);
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [toast, setToast] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function notify(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  }

  async function run(action: Promise<ActionResult>, done: string) {
    setActionError("");

    const result = await action;

    if (!result.ok) setActionError(result.error);
    else notify(done);
  }

  async function onPickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];

    event.target.value = "";

    if (!picked) return;

    if (picked.size > MAX_UPLOAD_BYTES) {
      setActionError("That file is larger than 50 MB.");

      return;
    }

    const file = withContentType(picked);

    setUploading(true);
    setActionError("");

    try {
      const fileKey = await uploadFileToS3({ file, folder: "community-files" });

      await run(
        addFile({
          title: file.name.replace(/\.[^.]+$/, ""),
          fileKey,
          fileName: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
        "File added",
      );
    } catch (err) {
      console.error("Community file upload error:", err);
      setActionError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <AdminLoadingState />;

  if (!community) {
    return (
      <AdminStack>
        <AdminHead crumbs={[{ label: "Communities", href: "/admin/communities" }]} title="Community" />
        <AdminErrorNote>{error || "Community not found."}</AdminErrorNote>
      </AdminStack>
    );
  }

  const hidden = community.status === "HIDDEN";

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Communities", href: "/admin/communities" }, { label: community.title }]}
        title={community.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className={adminTag(community.isPaid ? "amber" : "green")}>
              {community.isPaid ? `Paid · ${formatPrice(community.price)}` : "Free"}
            </span>
            {hidden && <span className={adminTag("gray")}>Hidden from parents</span>}
          </span>
        }
        actions={
          <>
            <button type="button" className={adminBtn("out")} onClick={() => setEditing(true)}>
              Edit
            </button>
            <button
              type="button"
              className={adminBtn(hidden ? "pri" : "dtx")}
              onClick={() =>
                void run(setStatus(hidden ? "ACTIVE" : "HIDDEN"), hidden ? "Community is visible again" : "Community hidden")
              }
            >
              {hidden ? "Show" : "Hide"}
            </button>
          </>
        }
      />

      <p className={`${ADMIN_CARD} whitespace-pre-line p-5 text-pd-ink2`}>{community.description}</p>

      <AdminErrorNote>{actionError || error}</AdminErrorNote>

      <AdminPillTabs<Tab>
        label="Community sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "files", label: "Files", count: community.files.length },
          { value: "members", label: "Members", count: members.length },
        ]}
      />

      {tab === "files" && (
        <>
          <div>
            <input ref={fileInput} type="file" className="hidden" onChange={(e) => void onPickFile(e)} />
            <button
              type="button"
              className={adminBtn("pri")}
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
            >
              {uploading ? "Uploading…" : "Add file"}
            </button>
          </div>

          {community.files.length === 0 ? (
            <AdminEmptyState title="No files yet" message="Add ebooks, notes or documents for members." />
          ) : (
            <AdminDataTable
              rows={community.files}
              rowKey={(f) => f.id}
              columns={[
                {
                  label: "File",
                  block: true,
                  render: (f) => (
                    <a href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-pd-brand hover:underline">
                      {f.title}
                    </a>
                  ),
                },
                { label: "Name", render: (f) => <span className="break-all text-pd-ink2">{f.fileName}</span> },
                { label: "Size", nowrap: true, render: (f) => formatBytes(f.sizeBytes) || "—" },
                { label: "Added", nowrap: true, render: (f) => formatDate(f.createdAt) },
                {
                  label: "Action",
                  right: true,
                  block: true,
                  render: (f) => (
                    <button type="button" className={adminBtn("dtx", "sm")} onClick={() => setDeletingFile(f)}>
                      Delete
                    </button>
                  ),
                },
              ]}
            />
          )}
        </>
      )}

      {tab === "members" &&
        (members.length === 0 ? (
          <AdminEmptyState title="No members yet" message="Parents who join this community will appear here." />
        ) : (
          <AdminDataTable
            rows={members}
            rowKey={(m) => m.id}
            columns={[
              { label: "Parent", block: true, render: (m) => <span className="font-semibold">{m.name}</span> },
              { label: "Email", render: (m) => <span className="break-all text-pd-ink2">{m.email}</span> },
              { label: "Phone", nowrap: true, render: (m) => m.phone || "—" },
              { label: "Joined", nowrap: true, render: (m) => formatDate(m.joinedAt) },
              {
                label: "Action",
                right: true,
                block: true,
                render: (m) => (
                  <button type="button" className={adminBtn("dtx", "sm")} onClick={() => setRemoving(m)}>
                    Remove
                  </button>
                ),
              },
            ]}
          />
        ))}

      {editing && (
        <CommunityFormDialog
          heading="Edit community"
          confirmLabel="Save"
          initial={{
            title: community.title,
            description: community.description,
            isPaid: community.isPaid,
            price: community.price === null ? "" : String(community.price),
          }}
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            const result = await edit(values);

            if (!result.ok) return result.error;

            setEditing(false);
            notify("Community updated");

            return null;
          }}
        />
      )}

      {deletingFile && (
        <AdminConfirmDialog
          title="Delete this file?"
          confirmLabel="Delete file"
          danger
          onCancel={() => setDeletingFile(null)}
          onConfirm={async () => {
            const result = await deleteFile(deletingFile.id);

            if (!result.ok) return result.error;

            setDeletingFile(null);
            notify("File deleted");

            return null;
          }}
        >
          “{deletingFile.title}” will be removed for everyone in this community. This cannot be undone.
        </AdminConfirmDialog>
      )}

      {removing && (
        <AdminConfirmDialog
          title="Remove this member?"
          confirmLabel="Remove member"
          danger
          onCancel={() => setRemoving(null)}
          onConfirm={async () => {
            const result = await removeMember(removing.id);

            if (!result.ok) return result.error;

            setRemoving(null);
            notify("Member removed");

            return null;
          }}
        >
          {removing.name} will lose access to this community.
        </AdminConfirmDialog>
      )}

      {toast && <AdminToast message={toast} />}
    </AdminStack>
  );
}
