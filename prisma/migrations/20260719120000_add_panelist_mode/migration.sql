-- CreateEnum
CREATE TYPE "PanelistMode" AS ENUM ('akshay', 'archy', 'both');

-- AlterTable
ALTER TABLE "interview_sessions" ADD COLUMN "panelistMode" "PanelistMode" NOT NULL DEFAULT 'both';

-- AlterTable
ALTER TABLE "interview_sessions" ALTER COLUMN "inputMode" SET DEFAULT 'voice';
