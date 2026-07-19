"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SessionHistoryCard } from "@/components/history/session-history-card";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import { Skeleton } from "@/components/ui/skeleton";
import { roles } from "@/lib/design/tokens";
import { backfillPendingReport } from "@/lib/session/backfill-reports";

import type { InterviewDuration } from "@/lib/interview/duration-profiles";

type HistorySession = {
  id: string;
  publicId: string;
  roleTitle: string;
  panelistMode: string;
  interviewDuration?: InterviewDuration;
  status: string;
  questionCount: number;
  overallScore: number | null;
  hasReport: boolean;
  startedAt: string;
  completedAt: string | null;
  hasRecording: boolean;
  recordingStatus: string | null;
  snapshotCount: number;
};

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "active", label: "Active" },
  { value: "abandoned", label: "Abandoned" },
  { value: "error", label: "Error" },
] as const;

export default function HistoryPage() {
  const { status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>();
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [backfilling, setBackfilling] = useState(false);
  const [backfillError, setBackfillError] = useState<string>();

  const pendingReportSessions = sessions.filter(
    (session) => session.status === "completed" && !session.hasReport,
  );

  const buildQuery = useCallback(
    (offset: number) => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (statusFilter) params.set("status", statusFilter);
      if (roleFilter) params.set("roleId", roleFilter);
      if (appliedSearch.trim()) params.set("q", appliedSearch.trim());
      return params.toString();
    },
    [appliedSearch, roleFilter, statusFilter],
  );

  const loadHistory = useCallback(
    async (offset = 0, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(undefined);

      try {
        const response = await fetch(`/api/sessions/mine?${buildQuery(offset)}`);
        if (response.status === 401) {
          router.replace("/login?callbackUrl=/history");
          return;
        }
        if (!response.ok) {
          throw new Error("Failed to load history.");
        }
        const data = (await response.json()) as {
          sessions: HistorySession[];
          total: number;
        };
        setTotal(data.total);
        setSessions((current) =>
          append ? [...current, ...data.sessions] : data.sessions,
        );
      } catch {
        setError("Could not load your Machine Rounds.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildQuery, router],
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/history");
      return;
    }
    if (status === "authenticated") {
      queueMicrotask(() => void loadHistory());
    }
  }, [status, router, loadHistory]);

  const hasMore = sessions.length < total;

  async function handleDelete(sessionId: string): Promise<void> {
    const response = await fetch(`/api/sessions/${sessionId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Could not delete session.");
    }
    setSessions((current) => current.filter((session) => session.id !== sessionId));
    setTotal((current) => Math.max(0, current - 1));
  }

  async function handleBackfillPendingReports() {
    if (pendingReportSessions.length === 0) return;
    setBackfilling(true);
    setBackfillError(undefined);

    try {
      for (const session of pendingReportSessions) {
        const result = await backfillPendingReport(session.id);
        if (!result.ok) {
          throw new Error(result.error);
        }
      }
      await loadHistory();
    } catch (caught) {
      setBackfillError(
        caught instanceof Error
          ? caught.message
          : "Could not generate one or more pending reports.",
      );
    } finally {
      setBackfilling(false);
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "My Machine Rounds" },
          ]}
        />
        <p className="nd-section-heading mb-3 mt-6">History</p>
        <h1 className="font-heading text-3xl font-medium sm:text-4xl">
          My Machine Rounds
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Replay past interviews with transcripts, reports, and session media.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Status</span>
            <select
              className="nd-input min-w-[10rem] rounded-md border border-border bg-secondary px-3 py-2"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setAppliedSearch(searchQuery);
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Role</span>
            <select
              className="nd-input min-w-[12rem] rounded-md border border-border bg-secondary px-3 py-2"
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value);
                setAppliedSearch(searchQuery);
              }}
            >
              <option value="">All roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[14rem] flex-1 flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Search role</span>
            <input
              className="nd-input rounded-md border border-border bg-secondary px-3 py-2"
              placeholder="e.g. Backend"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setAppliedSearch(searchQuery);
                }
              }}
            />
          </label>
          <Button
            variant="ndPrimary"
            onClick={() => setAppliedSearch(searchQuery)}
          >
            Apply filters
          </Button>
        </div>

        {loading || status === "loading" ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-44 w-full rounded-lg" />
            <Skeleton className="h-44 w-full rounded-lg" />
          </div>
        ) : error ? (
          <ApiErrorCard
            className="mt-10"
            message={error}
            onRetry={() => void loadHistory()}
          />
        ) : sessions.length === 0 ? (
          <div className="nd-course-card mt-10 p-8 text-center">
            <p className="text-muted-foreground">
              No Machine Rounds match these filters. Complete a signed-in
              interview or clear filters to see more.
            </p>
            <Button
              variant="ndPrimary"
              className="mt-6"
              render={<Link href="/interview" />}
            >
              Start a round
            </Button>
          </div>
        ) : (
          <>
            {pendingReportSessions.length > 0 ? (
              <div className="nd-course-card mt-8 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">
                    {pendingReportSessions.length} completed round
                    {pendingReportSessions.length === 1 ? "" : "s"} without a
                    report
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Generate readiness reports from saved transcripts.
                  </p>
                  {backfillError ? (
                    <p className="mt-2 text-sm text-red-400">{backfillError}</p>
                  ) : null}
                </div>
                <Button
                  variant="ndPrimary"
                  disabled={backfilling}
                  onClick={() => void handleBackfillPendingReports()}
                >
                  {backfilling
                    ? "Generating reports..."
                    : "Generate pending reports"}
                </Button>
              </div>
            ) : null}
            <p className="mt-6 text-sm text-muted-foreground">
              Showing {sessions.length} of {total} sessions
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {sessions.map((session) => (
                <SessionHistoryCard
                  key={session.id}
                  {...session}
                  onRecordingRetry={() => void loadHistory()}
                  onDelete={() => handleDelete(session.id)}
                />
              ))}
            </div>
            {hasMore ? (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="ndGhost"
                  disabled={loadingMore}
                  onClick={() => void loadHistory(sessions.length, true)}
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </PageShell>
  );
}
