-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "RoleSlug" AS ENUM ('full_stack', 'backend', 'frontend', 'product_minded');

-- CreateEnum
CREATE TYPE "QuestionCategory" AS ENUM ('behavioral', 'technical', 'system_design', 'mixed');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('active', 'thinking', 'completed', 'abandoned', 'error');

-- CreateEnum
CREATE TYPE "InputMode" AS ENUM ('text', 'voice', 'mixed');

-- CreateEnum
CREATE TYPE "WeakSignalType" AS ENUM ('rambling', 'vague_claim', 'no_example', 'off_topic', 'other');

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "slug" "RoleSlug" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.9,
    "language" TEXT NOT NULL DEFAULT 'English',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_questions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT,
    "content" TEXT NOT NULL,
    "category" "QuestionCategory" NOT NULL DEFAULT 'mixed',
    "difficulty" INTEGER,
    "metadata" JSONB,
    "embedding" vector(1536),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_sessions" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "userId" TEXT,
    "roleId" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'active',
    "inputMode" "InputMode" NOT NULL DEFAULT 'text',
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "topicsCovered" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weakSignals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "referencedAnswer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readiness_reports" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "shareToken" TEXT,
    "pdfUrl" TEXT,
    "modelDeployment" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "readiness_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_evaluations" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "clarity" INTEGER NOT NULL,
    "structure" INTEGER NOT NULL,
    "technicalSignal" INTEGER NOT NULL,

    CONSTRAINT "answer_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_red_flags" (
    "id" TEXT NOT NULL,
    "answerEvaluationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "signalType" "WeakSignalType" NOT NULL DEFAULT 'other',

    CONSTRAINT "answer_red_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_improvements" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "report_improvements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weak_topic_tags" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,

    CONSTRAINT "weak_topic_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletter_leads" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "resourcePreference" TEXT NOT NULL,
    "userId" TEXT,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "newsletter_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "realtime_session_logs" (
    "id" TEXT NOT NULL,
    "interviewSessionId" TEXT NOT NULL,
    "clientSecretIssuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deployment" TEXT,
    "endedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "realtime_session_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_slug_key" ON "roles"("slug");

-- CreateIndex
CREATE INDEX "roles_isActive_sortOrder_idx" ON "roles"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "interview_questions_roleId_idx" ON "interview_questions"("roleId");

-- CreateIndex
CREATE INDEX "interview_questions_isActive_idx" ON "interview_questions"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_sessionToken_key" ON "auth_sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_idx" ON "auth_sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "interview_sessions_publicId_key" ON "interview_sessions"("publicId");

-- CreateIndex
CREATE INDEX "interview_sessions_userId_idx" ON "interview_sessions"("userId");

-- CreateIndex
CREATE INDEX "interview_sessions_roleId_idx" ON "interview_sessions"("roleId");

-- CreateIndex
CREATE INDEX "interview_sessions_status_idx" ON "interview_sessions"("status");

-- CreateIndex
CREATE INDEX "interview_sessions_publicId_idx" ON "interview_sessions"("publicId");

-- CreateIndex
CREATE INDEX "interview_messages_sessionId_idx" ON "interview_messages"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "interview_messages_sessionId_sequence_key" ON "interview_messages"("sessionId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "readiness_reports_sessionId_key" ON "readiness_reports"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "readiness_reports_shareToken_key" ON "readiness_reports"("shareToken");

-- CreateIndex
CREATE INDEX "readiness_reports_shareToken_idx" ON "readiness_reports"("shareToken");

-- CreateIndex
CREATE INDEX "answer_evaluations_reportId_idx" ON "answer_evaluations"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "answer_evaluations_reportId_sequence_key" ON "answer_evaluations"("reportId", "sequence");

-- CreateIndex
CREATE INDEX "answer_red_flags_answerEvaluationId_idx" ON "answer_red_flags"("answerEvaluationId");

-- CreateIndex
CREATE INDEX "report_improvements_reportId_idx" ON "report_improvements"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "report_improvements_reportId_sequence_key" ON "report_improvements"("reportId", "sequence");

-- CreateIndex
CREATE INDEX "weak_topic_tags_reportId_idx" ON "weak_topic_tags"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "newsletter_leads_email_key" ON "newsletter_leads"("email");

-- CreateIndex
CREATE INDEX "newsletter_leads_userId_idx" ON "newsletter_leads"("userId");

-- CreateIndex
CREATE INDEX "realtime_session_logs_interviewSessionId_idx" ON "realtime_session_logs"("interviewSessionId");

-- AddForeignKey
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_messages" ADD CONSTRAINT "interview_messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readiness_reports" ADD CONSTRAINT "readiness_reports_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_evaluations" ADD CONSTRAINT "answer_evaluations_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "readiness_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer_red_flags" ADD CONSTRAINT "answer_red_flags_answerEvaluationId_fkey" FOREIGN KEY ("answerEvaluationId") REFERENCES "answer_evaluations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_improvements" ADD CONSTRAINT "report_improvements_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "readiness_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weak_topic_tags" ADD CONSTRAINT "weak_topic_tags_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "readiness_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "newsletter_leads" ADD CONSTRAINT "newsletter_leads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realtime_session_logs" ADD CONSTRAINT "realtime_session_logs_interviewSessionId_fkey" FOREIGN KEY ("interviewSessionId") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
