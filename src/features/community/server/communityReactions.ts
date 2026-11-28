import "server-only";

import { prisma } from "@/lib/prisma";

import type { CommunityReactionCounts } from "../types/community";

/** Reaction counting kept apart from the other community services so none of them import each other in a loop. */

export function emptyReactionCounts(): CommunityReactionCounts {
  return { LIKE: 0, LOVE: 0, CLAP: 0, HELPFUL: 0, THANKS: 0 };
}

/** Reaction counts per file for one community (one grouped query). */
export async function getReactionCountsByFile(communityId: string) {
  const rows = await prisma.communityFileReaction.groupBy({
    by: ["fileId", "type"],
    where: { communityId },
    _count: { _all: true },
  });

  const byFile = new Map<string, CommunityReactionCounts>();

  for (const row of rows) {
    const counts = byFile.get(row.fileId) ?? emptyReactionCounts();

    counts[row.type] = row._count._all;
    byFile.set(row.fileId, counts);
  }

  return byFile;
}
