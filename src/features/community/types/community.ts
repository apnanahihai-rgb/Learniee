/* ------------------------- Reactions and polls (shared) ------------------------- */

export type CommunityReactionType = "LIKE" | "LOVE" | "CLAP" | "HELPFUL" | "THANKS";

/** The only reactions a Parent can pick. Keep in step with the Prisma enum `CommunityReactionType`. */
export const COMMUNITY_REACTIONS: ReadonlyArray<{ type: CommunityReactionType; emoji: string; label: string }> = [
  { type: "LIKE", emoji: "👍", label: "Like" },
  { type: "LOVE", emoji: "❤️", label: "Love" },
  { type: "CLAP", emoji: "👏", label: "Well done" },
  { type: "HELPFUL", emoji: "💡", label: "Helpful" },
  { type: "THANKS", emoji: "🙏", label: "Thanks" },
];

export const COMMUNITY_REACTION_TYPES: ReadonlyArray<CommunityReactionType> = COMMUNITY_REACTIONS.map((r) => r.type);

export type CommunityReactionCounts = Record<CommunityReactionType, number>;

export const COMMUNITY_POLL_QUESTION_MAX = 200;
export const COMMUNITY_POLL_OPTION_MAX = 100;
export const COMMUNITY_POLL_MIN_OPTIONS = 2;
export const COMMUNITY_POLL_MAX_OPTIONS = 6;

export interface CommunityPollOptionResult {
  id: string;
  text: string;
  votes: number;
}

export interface PollFormValues {
  question: string;
  options: string[];
  allowMultiple: boolean;
  /** `datetime-local` value (browser local time); empty = no automatic end. */
  closesAt: string;
}

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
  reactionCounts: CommunityReactionCounts;
  reactionTotal: number;
}

export interface AdminPollVoter {
  parentId: string;
  name: string;
  email: string;
}

export interface AdminCommunityPollOption extends CommunityPollOptionResult {
  voters: AdminPollVoter[];
}

export interface AdminCommunityPoll {
  id: string;
  question: string;
  allowMultiple: boolean;
  /** Already accounts for `closesAt` having passed. */
  isClosed: boolean;
  closesAt: string | null;
  closedAt: string | null;
  createdAt: string;
  /** Distinct Parents who voted. */
  voterCount: number;
  options: AdminCommunityPollOption[];
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
  reactionCounts: CommunityReactionCounts;
  /** This Parent's own reaction, if any. */
  myReaction: CommunityReactionType | null;
}

export interface ParentCommunityPoll {
  id: string;
  question: string;
  allowMultiple: boolean;
  isClosed: boolean;
  closesAt: string | null;
  createdAt: string;
  voterCount: number;
  options: CommunityPollOptionResult[];
  /** Option ids this Parent picked (empty = has not voted). */
  myOptionIds: string[];
}

export interface ParentCommunityDetail extends ParentCommunityRow {
  /** Empty unless the Parent has joined. */
  files: ParentCommunityFile[];
  /** Empty unless the Parent has joined. */
  polls: ParentCommunityPoll[];
}
