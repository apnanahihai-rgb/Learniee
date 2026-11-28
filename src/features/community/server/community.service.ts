import "server-only";

import { ActivityActorRole, CommunityPaymentStatus, CommunityStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { UPLOAD_FOLDERS, createPresignedDownloadUrl, deleteS3Object } from "@/lib/s3";
import { logActivity } from "@/features/shared/server/activityLog.service";
import { displayName } from "@/features/shared/utils/displayName";
import { notifyCommunityFileAdded } from "@/features/shared/server/notificationTriggers.service";

import { emptyReactionCounts, getReactionCountsByFile } from "./communityReactions";

/**
 * Community, Part 1 (Admin, Dec 2026). Admin creates communities and shares
 * files; Parents (Parts 2 and 3) join and read. Every function here is called
 * only from verified-Admin routes (`requireAdmin`).
 */

export class CommunityError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface CommunityActor {
  sub: string;
  name?: string | null;
  email?: string | null;
}

export const COMMUNITY_TITLE_MAX = 120;
export const COMMUNITY_DESCRIPTION_MAX = 2000;
export const COMMUNITY_FILE_TITLE_MAX = 150;
export const COMMUNITY_PRICE_MAX = 1_000_000;

const FILE_KEY_PREFIX = `${UPLOAD_FOLDERS.COMMUNITY_FILES}/`;

/* -------------------------------- Validation ------------------------------- */

interface CommunityInput {
  title?: unknown;
  description?: unknown;
  isPaid?: unknown;
  price?: unknown;
  status?: unknown;
}

function cleanText(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new CommunityError(`${label} is required.`);
  }

  const text = value.trim();

  if (text.length > max) {
    throw new CommunityError(`${label} must be ${max} characters or fewer.`);
  }

  return text;
}

/** Paid needs a price above zero (2 decimals); free stores no price. */
function readPricing(isPaid: unknown, price: unknown): { isPaid: boolean; price: number | null } {
  if (typeof isPaid !== "boolean") {
    throw new CommunityError("Choose whether the community is free or paid.");
  }

  if (!isPaid) {
    return { isPaid: false, price: null };
  }

  const amount = typeof price === "number" ? price : Number(price);

  if (!Number.isFinite(amount) || amount <= 0 || amount > COMMUNITY_PRICE_MAX) {
    throw new CommunityError("Enter a price above 0 for a paid community.");
  }

  return { isPaid: true, price: Math.round(amount * 100) / 100 };
}

/* --------------------------------- Mapping -------------------------------- */

type CommunityWithCounts = Prisma.CommunityGetPayload<{
  include: { _count: { select: { files: true; members: true } } };
}>;

function toRow(c: CommunityWithCounts) {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    isPaid: c.isPaid,
    // Decimal columns need an explicit Number(...) (Prisma 7 gotcha).
    price: c.price === null ? null : Number(c.price),
    status: c.status,
    fileCount: c._count.files,
    memberCount: c._count.members,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

async function requireCommunity(communityId: string) {
  const community = await prisma.community.findUnique({ where: { id: communityId } });

  if (!community) {
    throw new CommunityError("Community not found.", 404);
  }

  return community;
}

/* ------------------------------ Communities ------------------------------- */

export async function listCommunities() {
  const rows = await prisma.community.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { files: true, members: true } } },
  });

  return rows.map(toRow);
}

export async function getCommunityDetail(communityId: string) {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    include: { files: { orderBy: { createdAt: "desc" } } },
  });

  if (!community) {
    throw new CommunityError("Community not found.", 404);
  }

  const reactionsByFile = await getReactionCountsByFile(communityId);

  const files = await Promise.all(
    community.files.map(async (f) => {
      const reactionCounts = reactionsByFile.get(f.id) ?? emptyReactionCounts();

      return {
        reactionCounts,
        reactionTotal: Object.values(reactionCounts).reduce((sum, n) => sum + n, 0),
        id: f.id,
        title: f.title,
        fileName: f.fileName,
        contentType: f.contentType,
        sizeBytes: f.sizeBytes,
        createdAt: f.createdAt.toISOString(),
        fileUrl: await createPresignedDownloadUrl(f.fileKey),
      };
    }),
  );

  return {
    id: community.id,
    title: community.title,
    description: community.description,
    isPaid: community.isPaid,
    price: community.price === null ? null : Number(community.price),
    status: community.status,
    createdAt: community.createdAt.toISOString(),
    updatedAt: community.updatedAt.toISOString(),
    files,
  };
}

export async function createCommunity(input: CommunityInput, actor: CommunityActor) {
  const title = cleanText(input.title, "Title", COMMUNITY_TITLE_MAX);
  const description = cleanText(input.description, "Description", COMMUNITY_DESCRIPTION_MAX);
  const pricing = readPricing(input.isPaid, input.price);

  const created = await prisma.community.create({
    data: {
      title,
      description,
      isPaid: pricing.isPaid,
      price: pricing.price,
      createdBySub: actor.sub,
    },
    include: { _count: { select: { files: true, members: true } } },
  });

  return toRow(created);
}

/**
 * Edit title / description / free-or-paid and hide or show (`status`).
 * Only the fields present in `input` change; pricing is re-validated as a
 * pair whenever either half is sent.
 */
export async function updateCommunity(communityId: string, input: CommunityInput) {
  const current = await requireCommunity(communityId);
  const data: Prisma.CommunityUpdateInput = {};

  if (input.title !== undefined) {
    data.title = cleanText(input.title, "Title", COMMUNITY_TITLE_MAX);
  }

  if (input.description !== undefined) {
    data.description = cleanText(input.description, "Description", COMMUNITY_DESCRIPTION_MAX);
  }

  if (input.isPaid !== undefined || input.price !== undefined) {
    const pricing = readPricing(
      input.isPaid === undefined ? current.isPaid : input.isPaid,
      input.price === undefined && current.price !== null ? Number(current.price) : input.price,
    );

    data.isPaid = pricing.isPaid;
    data.price = pricing.price;
  }

  if (input.status !== undefined) {
    if (input.status !== CommunityStatus.ACTIVE && input.status !== CommunityStatus.HIDDEN) {
      throw new CommunityError("status must be ACTIVE or HIDDEN.");
    }

    data.status = input.status;
  }

  if (Object.keys(data).length === 0) {
    throw new CommunityError("Nothing to update.");
  }

  const updated = await prisma.community.update({
    where: { id: communityId },
    data,
    include: { _count: { select: { files: true, members: true } } },
  });

  return toRow(updated);
}

/* ---------------------------------- Files ---------------------------------- */

export interface AddCommunityFileInput {
  title?: unknown;
  fileKey?: unknown;
  fileName?: unknown;
  contentType?: unknown;
  sizeBytes?: unknown;
}

/**
 * Records a file the browser already uploaded to S3 (presigned PUT into
 * `community-files/`). The key must sit under that folder so a caller cannot
 * point a community at some other object in the bucket.
 */
export async function addCommunityFile(
  communityId: string,
  input: AddCommunityFileInput,
  actor: CommunityActor,
) {
  await requireCommunity(communityId);

  const fileName = cleanText(input.fileName, "File name", 255);
  const title =
    typeof input.title === "string" && input.title.trim()
      ? cleanText(input.title, "Title", COMMUNITY_FILE_TITLE_MAX)
      : fileName.slice(0, COMMUNITY_FILE_TITLE_MAX);

  const fileKey = typeof input.fileKey === "string" ? input.fileKey.trim() : "";

  if (!fileKey.startsWith(FILE_KEY_PREFIX) || fileKey.includes("..")) {
    throw new CommunityError("Invalid file upload.");
  }

  const contentType = cleanText(input.contentType, "File type", 150);
  const size = typeof input.sizeBytes === "number" ? input.sizeBytes : Number(input.sizeBytes);
  const sizeBytes = Number.isInteger(size) && size >= 0 && size <= 2_147_483_647 ? size : null;

  const file = await prisma.communityFile.create({
    data: {
      communityId,
      title,
      fileKey,
      fileName,
      contentType,
      sizeBytes,
      uploadedBySub: actor.sub,
    },
  });

  // Part 2: tell the Parents who joined (never throws; see notificationTriggers).
  await notifyCommunityFileAdded(file.id);

  return {
    id: file.id,
    title: file.title,
    fileName: file.fileName,
    contentType: file.contentType,
    sizeBytes: file.sizeBytes,
    createdAt: file.createdAt.toISOString(),
    fileUrl: await createPresignedDownloadUrl(file.fileKey),
    reactionCounts: emptyReactionCounts(),
    reactionTotal: 0,
  };
}

export async function deleteCommunityFile(
  communityId: string,
  fileId: string,
  actor: CommunityActor,
) {
  const file = await prisma.communityFile.findFirst({
    where: { id: fileId, communityId },
    include: { community: { select: { title: true } } },
  });

  if (!file) {
    throw new CommunityError("File not found.", 404);
  }

  await prisma.communityFile.delete({ where: { id: file.id } });

  // The row is the source of truth; a failed S3 delete only orphans an object.
  try {
    await deleteS3Object(file.fileKey);
  } catch (err) {
    console.error("Community file S3 delete failed:", file.fileKey, err);
  }

  await logActivity({
    action: "COMMUNITY_FILE_DELETED",
    actorRole: ActivityActorRole.ADMIN,
    actorId: actor.sub,
    actorName: actor.name ?? null,
    actorEmail: actor.email ?? null,
    description: `Deleted "${file.title}" from community "${file.community.title}"`,
    metadata: { communityId, fileId: file.id },
  });
}

/* --------------------------------- Members -------------------------------- */

export async function listCommunityMembers(communityId: string) {
  await requireCommunity(communityId);

  const members = await prisma.communityMember.findMany({
    where: { communityId },
    orderBy: { joinedAt: "desc" },
    include: {
      parent: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          visibleName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  // Part 3: which of them paid (a standing payment, not a refunded one).
  const payments = members.length
    ? await prisma.communityPayment.findMany({
        where: {
          communityId,
          status: CommunityPaymentStatus.PAID,
          parentId: { in: members.map((m) => m.parentId) },
        },
        select: { parentId: true, amountPaid: true },
      })
    : [];

  const paidByParent = new Map<string, number>();

  for (const p of payments) {
    paidByParent.set(p.parentId, (paidByParent.get(p.parentId) ?? 0) + Number(p.amountPaid));
  }

  return members.map((m) => ({
    id: m.id,
    parentId: m.parent.id,
    name: displayName(m.parent),
    email: m.parent.email,
    phone: m.parent.phone,
    joinedAt: m.joinedAt.toISOString(),
    // null = joined without paying (a free community).
    paidAmount: paidByParent.has(m.parentId) ? Math.round((paidByParent.get(m.parentId) ?? 0) * 100) / 100 : null,
  }));
}

/**
 * Removes a Parent from a community (deletes the membership row). A Parent who
 * paid cannot be removed here: they would lose what they paid for with no
 * refund. To end a paid member's access, approve a FULL refund request instead
 * (Admin > Refund requests), which removes them and credits their Wallet.
 */
export async function removeCommunityMember(
  communityId: string,
  memberId: string,
  actor: CommunityActor,
) {
  const member = await prisma.communityMember.findFirst({
    where: { id: memberId, communityId },
    include: {
      community: { select: { title: true } },
      parent: { select: { firstName: true, lastName: true, visibleName: true } },
    },
  });

  if (!member) {
    throw new CommunityError("Member not found.", 404);
  }

  const paid = await prisma.communityPayment.findFirst({
    where: { communityId, parentId: member.parentId, status: CommunityPaymentStatus.PAID },
    select: { id: true },
  });

  if (paid) {
    throw new CommunityError(
      "This parent paid for this community, so they cannot be removed here. Approve a full refund request for their payment to end their access.",
      409,
    );
  }

  await prisma.communityMember.delete({ where: { id: member.id } });

  await logActivity({
    action: "COMMUNITY_MEMBER_REMOVED",
    actorRole: ActivityActorRole.ADMIN,
    actorId: actor.sub,
    actorName: actor.name ?? null,
    actorEmail: actor.email ?? null,
    description: `Removed ${displayName(member.parent)} from community "${member.community.title}"`,
    metadata: { communityId, parentId: member.parentId },
  });
}
