-- AlterTable
ALTER TABLE "interview_messages" ADD COLUMN "clientSyncId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "interview_messages_sessionId_clientSyncId_key" ON "interview_messages"("sessionId", "clientSyncId");
