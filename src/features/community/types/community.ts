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
  /** Rupees the Parent paid for a standing payment; null = joined without paying. */
  paidAmount: number | null;
}

export type CommunityPaymentStatus = "PAID" | "REFUNDED";

export interface AdminCommunityPayment {
  id: string;
  parentId: string;
  name: string;
  email: string;
  phone: string | null;
  /** The community price at the time (before GST / surcharge / UPI charge). */
  price: number;
  /** What the Parent was charged in total (= the invoice amount). */
  amountPaid: number;
  status: CommunityPaymentStatus;
  paidAt: string;
  refundedAt: string | null;
  invoiceNumber: string | null;
}

export interface AdminCommunityPaymentsSummary {
  paidCount: number;
  refundedCount: number;
  /** Total charged for payments that still stand (refunded ones excluded). */
  totalCollected: number;
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
  /** A standing (not refunded) payment exists: no new payment is needed to get back in. */
  hasPaid: boolean;
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
