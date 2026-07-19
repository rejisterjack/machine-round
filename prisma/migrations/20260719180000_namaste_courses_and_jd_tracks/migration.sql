-- RoleSlug course values
ALTER TYPE "RoleSlug" ADD VALUE IF NOT EXISTS 'namaste_dsa';
ALTER TYPE "RoleSlug" ADD VALUE IF NOT EXISTS 'namaste_react';
ALTER TYPE "RoleSlug" ADD VALUE IF NOT EXISTS 'namaste_node';
ALTER TYPE "RoleSlug" ADD VALUE IF NOT EXISTS 'namaste_frontend_system_design';
ALTER TYPE "RoleSlug" ADD VALUE IF NOT EXISTS 'namaste_javascript';
ALTER TYPE "RoleSlug" ADD VALUE IF NOT EXISTS 'namaste_interview';
ALTER TYPE "RoleSlug" ADD VALUE IF NOT EXISTS 'namaste_ai';
ALTER TYPE "RoleSlug" ADD VALUE IF NOT EXISTS 'mern_stack_bundle';
ALTER TYPE "RoleSlug" ADD VALUE IF NOT EXISTS 'frontend_master_bundle';
ALTER TYPE "RoleSlug" ADD VALUE IF NOT EXISTS 'advanced_fullstack_bundle';
ALTER TYPE "RoleSlug" ADD VALUE IF NOT EXISTS 'backend_system_design';
ALTER TYPE "RoleSlug" ADD VALUE IF NOT EXISTS 'job_custom';

-- Track mode for course vs JD sessions
CREATE TYPE "TrackMode" AS ENUM ('namaste_course', 'job_description');

ALTER TABLE "interview_sessions" ADD COLUMN IF NOT EXISTS "trackMode" "TrackMode" NOT NULL DEFAULT 'namaste_course';
ALTER TABLE "interview_sessions" ADD COLUMN IF NOT EXISTS "interviewRoundId" TEXT;
ALTER TABLE "interview_sessions" ADD COLUMN IF NOT EXISTS "interviewRoundTitle" TEXT;
ALTER TABLE "interview_sessions" ADD COLUMN IF NOT EXISTS "promptContext" TEXT;
ALTER TABLE "interview_sessions" ADD COLUMN IF NOT EXISTS "jobDescriptionSummary" TEXT;
