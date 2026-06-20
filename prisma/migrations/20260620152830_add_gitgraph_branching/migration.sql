-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "activeLeafId" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "parentMessageId" TEXT;

-- CreateIndex
CREATE INDEX "Message_parentMessageId_idx" ON "Message"("parentMessageId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_parentMessageId_fkey" FOREIGN KEY ("parentMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: chain existing messages linearly by createdAt
WITH ordered AS (
  SELECT id, "conversationId",
    LAG(id) OVER (PARTITION BY "conversationId" ORDER BY "createdAt") as prev_id
  FROM "Message"
)
UPDATE "Message" m
SET "parentMessageId" = o.prev_id
FROM ordered o
WHERE m.id = o.id AND o.prev_id IS NOT NULL;

-- Backfill: set activeLeafId to the latest message per conversation
WITH latest AS (
  SELECT DISTINCT ON ("conversationId") id, "conversationId"
  FROM "Message"
  ORDER BY "conversationId", "createdAt" DESC
)
UPDATE "Conversation" c
SET "activeLeafId" = l.id
FROM latest l
WHERE c.id = l."conversationId";
