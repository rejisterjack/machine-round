import type { InterviewDuration } from "@/lib/interview/duration-profiles";
import type { RoleSlug } from "@/generated/client";
import { roleSlugToId } from "@/lib/session/role-slug";

export type HistorySessionDto = {
  id: string;
  publicId: string;
  roleTitle: string;
  roleId?: string;
  panelistMode: string;
  interviewDuration?: InterviewDuration;
  status: string;
  questionCount: number;
  overallScore: number | null;
  hasReport: boolean;
  lastError?: string | null;
  startedAt: string;
  completedAt: string | null;
  hasRecording: boolean;
  recordingStatus: string | null;
  snapshotCount: number;
};

type HistorySessionRow = {
  id: string;
  publicId: string;
  panelistMode: string;
  interviewDuration: InterviewDuration | null;
  status: string;
  questionCount: number;
  lastError: string | null;
  startedAt: Date;
  completedAt: Date | null;
  audioRecordingUrl: string | null;
  recordingStatus: string | null;
  role: { title: string; slug: RoleSlug };
  report: { overallScore: number } | null;
  _count: { screenCaptures: number };
};

export function serializeHistorySession(session: HistorySessionRow): HistorySessionDto {
  return {
    id: session.id,
    publicId: session.publicId,
    roleTitle: session.role.title,
    roleId: roleSlugToId(session.role.slug),
    panelistMode: session.panelistMode,
    interviewDuration: session.interviewDuration ?? "minutes_30",
    status: session.status,
    questionCount: session.questionCount,
    overallScore: session.report?.overallScore ?? null,
    hasReport: Boolean(session.report),
    lastError: session.lastError,
    startedAt: session.startedAt.toISOString(),
    completedAt: session.completedAt?.toISOString() ?? null,
    hasRecording:
      session.recordingStatus === "uploaded" && Boolean(session.audioRecordingUrl),
    recordingStatus: session.recordingStatus,
    snapshotCount: session._count.screenCaptures,
  };
}
