import { createNotifications } from "@/features/shared/server/notification.service";
import { CommunityStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import "server-only";
import { R, T, safe } from "./shared";

/**
 * Community (Dec 2026, Part 2): every Parent who joined the community is told
 * once when Admin adds a file. A hidden community notifies nobody.
 */
export function notifyCommunityFileAdded(fileId: string) {
  return safe("community file added", async () => {
    const file = await prisma.communityFile.findUnique({
      where: { id: fileId },
      select: {
        title: true,
        communityId: true,
        community: { select: { title: true, status: true } },
      },
    });

    if (!file || file.community.status !== CommunityStatus.ACTIVE) return;

    const members = await prisma.communityMember.findMany({
      where: { communityId: file.communityId },
      select: { parentId: true },
    });

    await createNotifications(
      members.map((m) => ({
        recipientId: m.parentId,
        recipientRole: R.PARENT,
        type: T.COMMUNITY_FILE_ADDED,
        title: "New file in your community",
        message: `"${file.title}" was added to ${file.community.title}.`,
        link: `/parent/community/${file.communityId}`,
      })),
    );
  });
}

/**
 * Community engagement (Dec 2026): every Parent who joined the community is
 * told once when Admin posts a poll. A hidden community notifies nobody.
 */
export function notifyCommunityPollCreated(pollId: string) {
  return safe("community poll created", async () => {
    const poll = await prisma.communityPoll.findUnique({
      where: { id: pollId },
      select: {
        question: true,
        communityId: true,
        community: { select: { title: true, status: true } },
      },
    });

    if (!poll || poll.community.status !== CommunityStatus.ACTIVE) return;

    const members = await prisma.communityMember.findMany({
      where: { communityId: poll.communityId },
      select: { parentId: true },
    });

    await createNotifications(
      members.map((m) => ({
        recipientId: m.parentId,
        recipientRole: R.PARENT,
        type: T.COMMUNITY_POLL_CREATED,
        title: "New poll in your community",
        message: `${poll.community.title}: ${poll.question}`,
        link: `/parent/community/${poll.communityId}`,
      })),
    );
  });
}
