import "server-only";

import { ActivityActorRole, CommunityPollStatus, CommunityStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logActivity } from "@/features/shared/server/activityLog.service";
import { notifyCommunityPollCreated } from "@/features/shared/server/notificationTriggers.service";
import { displayName } from "@/features/shared/utils/displayName";

import {
  COMMUNITY_POLL_MAX_OPTIONS,
  COMMUNITY_POLL_MIN_OPTIONS,
  COMMUNITY_POLL_OPTION_MAX,
  COMMUNITY_POLL_QUESTION_MAX,
  COMMUNITY_REACTION_TYPES,
  type CommunityReactionType,
} from "../types/community";
import { CommunityError, type CommunityActor } from "./community.service";

/**
 * Community engagement (Dec 2026): members react to files with one of a few
 * emojis, and Admin runs polls that members answer. Admin sees the counts and
 * who voted; a Parent sees counts only. Every Parent function takes the
 * verified `parentId` and re-checks membership on each call, so leaving or
 * being removed stops taking part straight away.
 */

/* --------------------------------- Helpers -------------------------------- */

/** A poll is closed when Admin closed it, or its end time has passed (no cron needed). */
function isPollClosed(poll: { status: CommunityPollStatus; closesAt: Date | null }): boolean {
  return poll.status === CommunityPollStatus.CLOSED || (poll.closesAt !== null && poll.closesAt.getTime() <= Date.now());
}

async function requireCommunityExists(communityId: string) {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { id: true, title: true },
  });

  if (!community) {
    throw new CommunityError("Community not found.", 404);
  }

  return community;
}

/** The community must be visible (not hidden) and this Parent must have joined it. */
async function requireMember(communityId: string, parentId: string) {
  const community = await prisma.community.findFirst({
    where: { id: communityId, status: CommunityStatus.ACTIVE },
    select: { id: true },
  });

  if (!community) {
    throw new CommunityError("Community not found.", 404);
  }

  const member = await prisma.communityMember.findUnique({
    where: { communityId_parentId: { communityId, parentId } },
    select: { id: true },
  });

  if (!member) {
    throw new CommunityError("Join this community to take part.", 403);
  }
}

/* ------------------------------- Reactions -------------------------------- */

/** This Parent's own reaction per file, for one community. */
export async function getMyReactionsByFile(communityId: string, parentId: string) {
  const rows = await prisma.communityFileReaction.findMany({
    where: { communityId, parentId },
    select: { fileId: true, type: true },
  });

  return new Map<string, CommunityReactionType>(rows.map((r) => [r.fileId, r.type] as const));
}

/**
 * Set, change or remove the Parent's reaction on one file. One reaction per
 * Parent per file: sending a new type replaces the old one, `null` removes it.
 */
export async function setFileReaction(communityId: string, fileId: string, parentId: string, type: unknown) {
  await requireMember(communityId, parentId);

  const file = await prisma.communityFile.findFirst({
    where: { id: fileId, communityId },
    select: { id: true },
  });

  if (!file) {
    throw new CommunityError("File not found.", 404);
  }

  if (type === null) {
    await prisma.communityFileReaction.deleteMany({ where: { fileId, parentId } });

    return;
  }

  if (typeof type !== "string" || !COMMUNITY_REACTION_TYPES.includes(type as CommunityReactionType)) {
    throw new CommunityError("Choose one of the available reactions.");
  }

  const reaction = type as CommunityReactionType;

  await prisma.communityFileReaction.upsert({
    where: { fileId_parentId: { fileId, parentId } },
    create: { fileId, communityId, parentId, type: reaction },
    update: { type: reaction },
  });
}

/* ------------------------------ Polls: Admin ------------------------------- */

interface PollInput {
  question?: unknown;
  options?: unknown;
  allowMultiple?: unknown;
  closesAt?: unknown;
}

function readPollInput(input: PollInput) {
  if (typeof input.question !== "string" || !input.question.trim()) {
    throw new CommunityError("Question is required.");
  }

  const question = input.question.trim();

  if (question.length > COMMUNITY_POLL_QUESTION_MAX) {
    throw new CommunityError(`Question must be ${COMMUNITY_POLL_QUESTION_MAX} characters or fewer.`);
  }

  if (!Array.isArray(input.options)) {
    throw new CommunityError("Add the answer options.");
  }

  const options: string[] = [];

  for (const raw of input.options) {
    if (typeof raw !== "string") {
      throw new CommunityError("Each option must be text.");
    }

    const text = raw.trim();

    // Blank rows from the form are ignored rather than rejected.
    if (!text) continue;

    if (text.length > COMMUNITY_POLL_OPTION_MAX) {
      throw new CommunityError(`Each option must be ${COMMUNITY_POLL_OPTION_MAX} characters or fewer.`);
    }

    options.push(text);
  }

  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
    throw new CommunityError("Options must be different from each other.");
  }

  if (options.length < COMMUNITY_POLL_MIN_OPTIONS || options.length > COMMUNITY_POLL_MAX_OPTIONS) {
    throw new CommunityError(
      `A poll needs ${COMMUNITY_POLL_MIN_OPTIONS} to ${COMMUNITY_POLL_MAX_OPTIONS} options.`,
    );
  }

  if (typeof input.allowMultiple !== "boolean") {
    throw new CommunityError("Choose whether members can pick more than one option.");
  }

  let closesAt: Date | null = null;

  if (input.closesAt !== undefined && input.closesAt !== null && input.closesAt !== "") {
    closesAt = typeof input.closesAt === "string" ? new Date(input.closesAt) : new Date(Number.NaN);

    if (Number.isNaN(closesAt.getTime())) {
      throw new CommunityError("The end time is not valid.");
    }

    if (closesAt.getTime() <= Date.now()) {
      throw new CommunityError("The end time must be in the future.");
    }
  }

  return { question, options, allowMultiple: input.allowMultiple, closesAt };
}

export async function listPollsForAdmin(communityId: string) {
  await requireCommunityExists(communityId);

  const polls = await prisma.communityPoll.findMany({
    where: { communityId },
    orderBy: { createdAt: "desc" },
    include: {
      options: {
        orderBy: { position: "asc" },
        include: {
          votes: {
            orderBy: { createdAt: "asc" },
            include: {
              parent: {
                select: { id: true, firstName: true, lastName: true, visibleName: true, email: true },
              },
            },
          },
        },
      },
    },
  });

  return polls.map((poll) => ({
    id: poll.id,
    question: poll.question,
    allowMultiple: poll.allowMultiple,
    isClosed: isPollClosed(poll),
    closesAt: poll.closesAt?.toISOString() ?? null,
    closedAt: poll.closedAt?.toISOString() ?? null,
    createdAt: poll.createdAt.toISOString(),
    voterCount: new Set(poll.options.flatMap((o) => o.votes.map((v) => v.parentId))).size,
    options: poll.options.map((o) => ({
      id: o.id,
      text: o.text,
      votes: o.votes.length,
      voters: o.votes.map((v) => ({
        parentId: v.parent.id,
        name: displayName(v.parent),
        email: v.parent.email,
      })),
    })),
  }));
}

export async function createPoll(communityId: string, input: PollInput, actor: CommunityActor) {
  const community = await requireCommunityExists(communityId);
  const { question, options, allowMultiple, closesAt } = readPollInput(input);

  const poll = await prisma.communityPoll.create({
    data: {
      communityId,
      question,
      allowMultiple,
      closesAt,
      createdBySub: actor.sub,
      options: { create: options.map((text, position) => ({ text, position })) },
    },
    select: { id: true },
  });

  // Tell the members who joined (never throws; see notificationTriggers).
  await notifyCommunityPollCreated(poll.id);

  await logActivity({
    action: "COMMUNITY_POLL_CREATED",
    actorRole: ActivityActorRole.ADMIN,
    actorId: actor.sub,
    actorName: actor.name ?? null,
    actorEmail: actor.email ?? null,
    description: `Posted a poll in community "${community.title}": ${question}`,
    metadata: { communityId, pollId: poll.id },
  });

  return { id: poll.id };
}

async function requirePoll(communityId: string, pollId: string) {
  const poll = await prisma.communityPoll.findFirst({
    where: { id: pollId, communityId },
    include: { community: { select: { title: true } } },
  });

  if (!poll) {
    throw new CommunityError("Poll not found.", 404);
  }

  return poll;
}

/** Close a poll now. Closing twice is harmless. Votes and results are kept. */
export async function closePoll(communityId: string, pollId: string, actor: CommunityActor) {
  const poll = await requirePoll(communityId, pollId);

  if (poll.status === CommunityPollStatus.CLOSED) return;

  // Conditional update: only the request that flips OPEN -> CLOSED logs it.
  const { count } = await prisma.communityPoll.updateMany({
    where: { id: poll.id, status: CommunityPollStatus.OPEN },
    data: { status: CommunityPollStatus.CLOSED, closedAt: new Date() },
  });

  if (count === 0) return;

  await logActivity({
    action: "COMMUNITY_POLL_CLOSED",
    actorRole: ActivityActorRole.ADMIN,
    actorId: actor.sub,
    actorName: actor.name ?? null,
    actorEmail: actor.email ?? null,
    description: `Closed a poll in community "${poll.community.title}": ${poll.question}`,
    metadata: { communityId, pollId: poll.id },
  });
}

/** Delete a poll with its options and votes. Cannot be undone. */
export async function deletePoll(communityId: string, pollId: string, actor: CommunityActor) {
  const poll = await requirePoll(communityId, pollId);

  await prisma.communityPoll.delete({ where: { id: poll.id } });

  await logActivity({
    action: "COMMUNITY_POLL_DELETED",
    actorRole: ActivityActorRole.ADMIN,
    actorId: actor.sub,
    actorName: actor.name ?? null,
    actorEmail: actor.email ?? null,
    description: `Deleted a poll in community "${poll.community.title}": ${poll.question}`,
    metadata: { communityId, pollId: poll.id },
  });
}

/* ----------------------------- Polls: Parent ------------------------------- */

/** All polls of a community with counts (no names) and this Parent's own picks. Members only (caller checks). */
export async function listPollsForParent(communityId: string, parentId: string) {
  const polls = await prisma.communityPoll.findMany({
    where: { communityId },
    orderBy: { createdAt: "desc" },
    include: {
      options: {
        orderBy: { position: "asc" },
        include: { _count: { select: { votes: true } } },
      },
    },
  });

  if (polls.length === 0) return [];

  const pollIds = polls.map((p) => p.id);

  const [mine, voters] = await Promise.all([
    prisma.communityPollVote.findMany({
      where: { pollId: { in: pollIds }, parentId },
      select: { pollId: true, optionId: true },
    }),
    prisma.communityPollVote.groupBy({
      by: ["pollId", "parentId"],
      where: { pollId: { in: pollIds } },
    }),
  ]);

  const voterCount = new Map<string, number>();

  for (const row of voters) {
    voterCount.set(row.pollId, (voterCount.get(row.pollId) ?? 0) + 1);
  }

  return polls.map((poll) => ({
    id: poll.id,
    question: poll.question,
    allowMultiple: poll.allowMultiple,
    isClosed: isPollClosed(poll),
    closesAt: poll.closesAt?.toISOString() ?? null,
    createdAt: poll.createdAt.toISOString(),
    voterCount: voterCount.get(poll.id) ?? 0,
    options: poll.options.map((o) => ({ id: o.id, text: o.text, votes: o._count.votes })),
    myOptionIds: mine.filter((m) => m.pollId === poll.id).map((m) => m.optionId),
  }));
}

/**
 * Cast or change a vote while the poll is open. The Parent's previous picks
 * are replaced in one transaction that first locks the poll row, so two quick
 * taps can never leave a single-choice poll with two answers.
 */
export async function votePoll(communityId: string, pollId: string, parentId: string, optionIds: unknown) {
  await requireMember(communityId, parentId);

  const poll = await prisma.communityPoll.findFirst({
    where: { id: pollId, communityId },
    include: { options: { select: { id: true } } },
  });

  if (!poll) {
    throw new CommunityError("Poll not found.", 404);
  }

  if (isPollClosed(poll)) {
    throw new CommunityError("This poll is closed.", 409);
  }

  if (!Array.isArray(optionIds) || optionIds.some((id) => typeof id !== "string")) {
    throw new CommunityError("Choose an option.");
  }

  const picked = [...new Set(optionIds as string[])];
  const valid = new Set(poll.options.map((o) => o.id));

  if (picked.length === 0 || picked.some((id) => !valid.has(id))) {
    throw new CommunityError("Choose an option.");
  }

  if (!poll.allowMultiple && picked.length !== 1) {
    throw new CommunityError("Choose one option.");
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$queryRaw`SELECT "id" FROM "CommunityPoll" WHERE "id" = ${pollId} FOR UPDATE`;

    await tx.communityPollVote.deleteMany({ where: { pollId, parentId } });
    await tx.communityPollVote.createMany({
      data: picked.map((optionId) => ({ pollId, optionId, parentId })),
      skipDuplicates: true,
    });
  });
}
