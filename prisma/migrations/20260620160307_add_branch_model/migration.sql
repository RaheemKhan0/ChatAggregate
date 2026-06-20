-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "leafMessageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Branch_conversationId_idx" ON "Branch"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_conversationId_name_key" ON "Branch"("conversationId", "name");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: create a "main" branch for each existing conversation that has an activeLeafId
INSERT INTO "Branch" (id, name, "conversationId", "leafMessageId", "createdAt")
SELECT gen_random_uuid()::text, 'main', id, "activeLeafId", NOW()
FROM "Conversation"
WHERE "activeLeafId" IS NOT NULL;
