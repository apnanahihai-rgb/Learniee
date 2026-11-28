import "server-only";

import { CommunityPaymentStatus, CommunityStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createPresignedFileLink } from "@/lib/s3";

import { CommunityError } from "./community.service";

/**
 * Community, Part 2 (Parent, Dec 2026). A Parent sees every visible community,
 * joins free ones (no payment, as many as they like), leaves, and opens or
 * downloads the files of the communities they joined. Files are never listed
 * or linked for a non-member: the list endpoints return only a count, and the
 * file route re-checks membership on every open/download.
 *
 * Every function takes the verified `parentId` from `requireParentId`.
 *
 * Part 3: a paid community is joined by paying (`communityPayment.service.ts`),
 * which also creates the membership. A Parent whose payment still stands
 * (`hasPaid`) can always get back in without paying again.
 */

/** A community a Parent may see: it exists and is not hidden. */
async function requireVisibleCommunity(communityId: string) {
  const community = await prisma.community.findFirst({
    where: { id: communityId, status: CommunityStatus.ACTIVE },
  });

  if (!community) {
    throw new CommunityError("Community not found.", 404);
  }

  return community;
}

export async function listCommunitiesForParent(parentId: string) {
  const rows = await prisma.community.findMany({
    where: { status: CommunityStatus.ACTIVE },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { files: true, members: true } },
      members: { where: { parentId }, select: { joinedAt: true } },
      payments: { where: { parentId, status: CommunityPaymentStatus.PAID }, select: { id: true }, take: 1 },
    },
  });

  return rows.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    isPaid: c.isPaid,
    // Decimal columns need an explicit Number(...) (Prisma 7 gotcha).
    price: c.price === null ? null : Number(c.price),
    fileCount: c._count.files,
    memberCount: c._count.members,
    isMember: c.members.length > 0,
    hasPaid: c.payments.length > 0,
    joinedAt: c.members[0]?.joinedAt.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  }));
}

/** One community. `files` is filled only for a member; everyone else gets the count. */
export async function getCommunityForParent(communityId: string, parentId: string) {
  await requireVisibleCommunity(communityId);

  const community = await prisma.community.findUniqueOrThrow({
    where: { id: communityId },
    include: {
      _count: { select: { files: true, members: true } },
      members: { where: { parentId }, select: { joinedAt: true } },
      payments: { where: { parentId, status: CommunityPaymentStatus.PAID }, select: { id: true }, take: 1 },
    },
  });

  const isMember = community.members.length > 0;

  const files = isMember
    ? (
        await prisma.communityFile.findMany({
          where: { communityId },
          orderBy: { createdAt: "desc" },
        })
      ).map((f) => ({
        id: f.id,
        title: f.title,
        fileName: f.fileName,
        contentType: f.contentType,
        sizeBytes: f.sizeBytes,
        createdAt: f.createdAt.toISOString(),
      }))
    : [];

  return {
    id: community.id,
    title: community.title,
    description: community.description,
    isPaid: community.isPaid,
    price: community.price === null ? null : Number(community.price),
    fileCount: community._count.files,
    memberCount: community._count.members,
    isMember,
    hasPaid: community.payments.length > 0,
    joinedAt: community.members[0]?.joinedAt.toISOString() ?? null,
    createdAt: community.createdAt.toISOString(),
    files,
  };
}

/**
 * Join a community without paying. Idempotent: joining twice is the same as
 * joining once (the unique key on communityId + parentId makes the second
 * insert a no-op). A paid community needs a standing payment first: paying
 * (POST .../payment/order + verify) joins automatically, so this path only
 * restores access for a Parent who already paid.
 */
export async function joinCommunity(communityId: string, parentId: string) {
  const community = await requireVisibleCommunity(communityId);

  if (community.isPaid) {
    const paid = await prisma.communityPayment.findFirst({
      where: { communityId, parentId, status: CommunityPaymentStatus.PAID },
      select: { id: true },
    });

    if (!paid) {
      throw new CommunityError("This is a paid community. Pay to join it.", 403);
    }
  }

  await prisma.communityMember.createMany({
    data: [{ communityId, parentId }],
    skipDuplicates: true,
  });
}

/**
 * Leave a community. Idempotent; works even if the community was hidden meanwhile.
 * A Parent whose payment still stands cannot leave (they would lose what they
 * paid for); a refund request is how a paid membership ends.
 */
export async function leaveCommunity(communityId: string, parentId: string) {
  const exists = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  if (!exists) {
    throw new CommunityError("Community not found.", 404);
  }

  const paid = await prisma.communityPayment.findFirst({
    where: { communityId, parentId, status: CommunityPaymentStatus.PAID },
    select: { id: true },
  });

  if (paid) {
    throw new CommunityError(
      "You paid for this community, so your membership can't be left. Request a refund from Payments if you want out.",
      403,
    );
  }

  await prisma.communityMember.deleteMany({ where: { communityId, parentId } });
}

/**
 * A fresh short-lived link to open or download one file. Membership is
 * checked here, at click time, so leaving (or being removed) stops access
 * straight away rather than when an old link expires.
 */
export async function getCommunityFileLinkForParent(
  communityId: string,
  fileId: string,
  parentId: string,
  download: boolean,
) {
  await requireVisibleCommunity(communityId);

  const member = await prisma.communityMember.findUnique({
    where: { communityId_parentId: { communityId, parentId } },
    select: { id: true },
  });

  if (!member) {
    throw new CommunityError("Join this community to open its files.", 403);
  }

  const file = await prisma.communityFile.findFirst({ where: { id: fileId, communityId } });

  if (!file) {
    throw new CommunityError("File not found.", 404);
  }

  return createPresignedFileLink(file.fileKey, {
    fileName: file.fileName,
    contentType: file.contentType,
    download,
  });
}
