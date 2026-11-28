-- Community engagement (Dec 2026): reactions on files and polls. Additive only:
-- two new enums, four new tables, no existing table touched.

-- CreateEnum
CREATE TYPE "CommunityReactionType" AS ENUM ('LIKE', 'LOVE', 'CLAP', 'HELPFUL', 'THANKS');
CREATE TYPE "CommunityPollStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "CommunityFileReaction" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "type" "CommunityReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityFileReaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunityPoll" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
    "status" "CommunityPollStatus" NOT NULL DEFAULT 'OPEN',
    "closesAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdBySub" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityPoll_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunityPollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "CommunityPollOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommunityPollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityPollVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityFileReaction_fileId_parentId_key" ON "CommunityFileReaction"("fileId", "parentId");
CREATE INDEX "CommunityFileReaction_communityId_fileId_idx" ON "CommunityFileReaction"("communityId", "fileId");
CREATE INDEX "CommunityFileReaction_parentId_idx" ON "CommunityFileReaction"("parentId");
CREATE INDEX "CommunityPoll_communityId_createdAt_idx" ON "CommunityPoll"("communityId", "createdAt");
CREATE INDEX "CommunityPollOption_pollId_position_idx" ON "CommunityPollOption"("pollId", "position");
CREATE UNIQUE INDEX "CommunityPollVote_optionId_parentId_key" ON "CommunityPollVote"("optionId", "parentId");
CREATE INDEX "CommunityPollVote_pollId_parentId_idx" ON "CommunityPollVote"("pollId", "parentId");
CREATE INDEX "CommunityPollVote_parentId_idx" ON "CommunityPollVote"("parentId");

-- AddForeignKey
ALTER TABLE "CommunityFileReaction" ADD CONSTRAINT "CommunityFileReaction_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "CommunityFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityFileReaction" ADD CONSTRAINT "CommunityFileReaction_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityPoll" ADD CONSTRAINT "CommunityPoll_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityPollOption" ADD CONSTRAINT "CommunityPollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "CommunityPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityPollVote" ADD CONSTRAINT "CommunityPollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "CommunityPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityPollVote" ADD CONSTRAINT "CommunityPollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "CommunityPollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityPollVote" ADD CONSTRAINT "CommunityPollVote_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Realtime change feed (see 20261014090000_add_realtime_change_notify)
CREATE TRIGGER "learniee_realtime_notify"
  AFTER INSERT OR UPDATE OR DELETE ON "CommunityFileReaction"
  FOR EACH ROW EXECUTE FUNCTION "learniee_notify_change"();
CREATE TRIGGER "learniee_realtime_notify"
  AFTER INSERT OR UPDATE OR DELETE ON "CommunityPoll"
  FOR EACH ROW EXECUTE FUNCTION "learniee_notify_change"();
CREATE TRIGGER "learniee_realtime_notify"
  AFTER INSERT OR UPDATE OR DELETE ON "CommunityPollOption"
  FOR EACH ROW EXECUTE FUNCTION "learniee_notify_change"();
CREATE TRIGGER "learniee_realtime_notify"
  AFTER INSERT OR UPDATE OR DELETE ON "CommunityPollVote"
  FOR EACH ROW EXECUTE FUNCTION "learniee_notify_change"();
