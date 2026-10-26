-- Chat screening flags (Oct 26, 2026). Additive only: one enum, one table.
-- See ChatSafetyFlag in schema.prisma.

-- CreateEnum
CREATE TYPE "ChatFlagLevel" AS ENUM ('BLOCKED', 'SUSPICIOUS');

-- CreateTable
CREATE TABLE "ChatSafetyFlag" (
    "id" TEXT NOT NULL,
    "chatRoomId" TEXT NOT NULL,
    "chatMessageId" TEXT,
    "senderRole" "ChatSenderRole" NOT NULL,
    "senderId" TEXT NOT NULL,
    "level" "ChatFlagLevel" NOT NULL,
    "reasons" TEXT[],
    "text" TEXT NOT NULL,
    "detail" TEXT,
    "status" "ChatReportStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBySub" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatSafetyFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatSafetyFlag_status_createdAt_idx" ON "ChatSafetyFlag"("status", "createdAt");
CREATE INDEX "ChatSafetyFlag_chatRoomId_idx" ON "ChatSafetyFlag"("chatRoomId");
CREATE INDEX "ChatSafetyFlag_chatMessageId_idx" ON "ChatSafetyFlag"("chatMessageId");

-- AddForeignKey
ALTER TABLE "ChatSafetyFlag" ADD CONSTRAINT "ChatSafetyFlag_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatSafetyFlag" ADD CONSTRAINT "ChatSafetyFlag_chatMessageId_fkey" FOREIGN KEY ("chatMessageId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Realtime change feed (see 20261014090000_add_realtime_change_notify)
CREATE TRIGGER "learniee_realtime_notify"
  AFTER INSERT OR UPDATE OR DELETE ON "ChatSafetyFlag"
  FOR EACH ROW EXECUTE FUNCTION "learniee_notify_change"();
