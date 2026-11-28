import "server-only";

import { CommunityStatus } from "@prisma/client";

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
    joinedAt: community.members[0]?.joinedAt.toISOString() ?? null,
    createdAt: community.createdAt.toISOString(),
    files,
  };
}

/**
 * Join a free community. Idempotent: joining twice is the same as joining
 * once (the unique key on communityId + parentId makes the second insert a
 * no-op). Paid communities are refused here until the paid flow exists.
 */
export async function joinCommunity(communityId: string, parentId: string) {
  const community = await requireVisibleCommunity(communityId);

  if (community.isPaid) {
    throw new CommunityError("This is a paid community. Paid joining is not available yet.", 403);
  }

  await prisma.communityMember.createMany({
    data: [{ communityId, parentId }],
    skipDuplicates: true,
  });
}

/** Leave a community. Idempotent; works even if the community was hidden meanwhile. */
export async function leaveCommunity(communityId: string, parentId: string) {
  const exists = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true },
  });

  if (!exists) {
    throw new CommunityError("Community not found.", 404);
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
