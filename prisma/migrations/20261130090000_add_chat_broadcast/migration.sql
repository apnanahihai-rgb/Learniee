-- Group classes (Nov 2026): a Teacher announcement sent to every student of a
-- group. Additive; existing messages stay false.
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "isBroadcast" BOOLEAN NOT NULL DEFAULT false;
