export type CommunityStatus = "ACTIVE" | "HIDDEN";

export interface AdminCommunityRow {
  id: string;
  title: string;
  description: string;
  isPaid: boolean;
  price: number | null;
  status: CommunityStatus;
  fileCount: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCommunityFile {
  id: string;
  title: string;
  fileName: string;
  contentType: string;
  sizeBytes: number | null;
  createdAt: string;
  /** Short-lived presigned download link (the bucket stays private). */
  fileUrl: string;
}

export interface AdminCommunityDetail extends Omit<AdminCommunityRow, "fileCount" | "memberCount"> {
  files: AdminCommunityFile[];
}

export interface AdminCommunityMember {
  id: string;
  parentId: string;
  name: string;
  email: string;
  phone: string | null;
  joinedAt: string;
}

export interface CommunityFormValues {
  title: string;
  description: string;
  isPaid: boolean;
  /** Rupees as typed; only used when `isPaid`. */
  price: string;
}

/* ------------------------------ Parent side ------------------------------ */

export interface ParentCommunityRow {
  id: string;
  title: string;
  description: string;
  isPaid: boolean;
  price: number | null;
  fileCount: number;
  memberCount: number;
  isMember: boolean;
  joinedAt: string | null;
  createdAt: string;
}

/** A file as a Parent sees it: no link here; open/download go through the file route. */
export interface ParentCommunityFile {
  id: string;
  title: string;
  fileName: string;
  contentType: string;
  sizeBytes: number | null;
  createdAt: string;
}

export interface ParentCommunityDetail extends ParentCommunityRow {
  /** Empty unless the Parent has joined. */
  files: ParentCommunityFile[];
}
