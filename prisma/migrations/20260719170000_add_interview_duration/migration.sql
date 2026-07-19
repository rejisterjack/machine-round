-- CreateEnum
CREATE TYPE "InterviewDuration" AS ENUM ('minutes_15', 'minutes_30', 'minutes_60');

-- AlterTable
ALTER TABLE "interview_sessions" ADD COLUMN "interviewDuration" "InterviewDuration" NOT NULL DEFAULT 'minutes_30';
