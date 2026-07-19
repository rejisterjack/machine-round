-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('none', 'pending', 'uploaded', 'failed');

-- AlterTable
ALTER TABLE "interview_sessions" ADD COLUMN "audioRecordingUrl" TEXT,
ADD COLUMN "audioRecordingId" TEXT,
ADD COLUMN "recordingDurationMs" INTEGER,
ADD COLUMN "recordingMimeType" TEXT,
ADD COLUMN "recordingStatus" "RecordingStatus" NOT NULL DEFAULT 'none';

-- AlterTable
ALTER TABLE "readiness_reports" ADD COLUMN "screenReviewNotes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "session_screen_captures" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "cloudinaryUrl" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT NOT NULL,
    "summary" TEXT,
    "questionSequence" INTEGER,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_screen_captures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_screen_observations" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_screen_observations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_screen_captures_sessionId_idx" ON "session_screen_captures"("sessionId");

-- CreateIndex
CREATE INDEX "session_screen_observations_sessionId_idx" ON "session_screen_observations"("sessionId");

-- AddForeignKey
ALTER TABLE "session_screen_captures" ADD CONSTRAINT "session_screen_captures_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_screen_observations" ADD CONSTRAINT "session_screen_observations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
