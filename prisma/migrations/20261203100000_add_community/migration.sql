-- Community (Dec 2026), Part 1: Admin. Additive only: one enum, three tables.

-- CreateEnum
CREATE TYPE "CommunityStatus" AS ENUM ('ACTIVE', 'HIDDEN');

-- CreateTable
CREATE TABLE "Community" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "price" DECIMAL(10,2),
    "status" "CommunityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBySub" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityFile" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "uploadedBySub" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMember" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Community_status_createdAt_idx" ON "Community"("status", "createdAt");
CREATE INDEX "CommunityFile_communityId_createdAt_idx" ON "CommunityFile"("communityId", "createdAt");
CREATE UNIQUE INDEX "CommunityMember_communityId_parentId_key" ON "CommunityMember"("communityId", "parentId");
CREATE INDEX "CommunityMember_parentId_idx" ON "CommunityMember"("parentId");

-- AddForeignKey
ALTER TABLE "CommunityFile" ADD CONSTRAINT "CommunityFile_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Realtime change feed (see 20261014090000_add_realtime_change_notify)
CREATE TRIGGER "learniee_realtime_notify"
  AFTER INSERT OR UPDATE OR DELETE ON "Community"
  FOR EACH ROW EXECUTE FUNCTION "learniee_notify_change"();
CREATE TRIGGER "learniee_realtime_notify"
  AFTER INSERT OR UPDATE OR DELETE ON "CommunityFile"
  FOR EACH ROW EXECUTE FUNCTION "learniee_notify_change"();
CREATE TRIGGER "learniee_realtime_notify"
  AFTER INSERT OR UPDATE OR DELETE ON "CommunityMember"
  FOR EACH ROW EXECUTE FUNCTION "learniee_notify_change"();
