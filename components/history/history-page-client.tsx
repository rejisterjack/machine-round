"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { deleteSessionAction } from "@/lib/actions/session-actions";
import { SessionHistoryCard } from "@/components/history/session-history-card";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import { roles } from "@/lib/design/tokens";
import type { HistorySessionDto } from "@/lib/session/history-serialization";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "active", label: "Active" },
  { value: "thinking", label: "Processing" },
  { value: "abandoned", label: "Abandoned" },
  { value: "error", label: "Error" },
] as const;

type HistoryPageClientProps = {
  initialSessions: HistorySessionDto[];
  initialTotal: number;
  initialPendingReportCount: number;
};

export function HistoryPageClient({
  initialSessions,
  initialTotal,
  initialPendingReportCount,
}: HistoryPageClientProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>();
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [backfilling, setBackfilling] = useState(false);
  const [backfillError, setBackfillError] = useState<string>();
  const [pendingReportCount, setPendingReportCount] = useState(
    initialPendingReportCount,
  );
  const skipInitialFetch = useRef(true);

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
          sessions: HistorySessionDto[];
          total: number;
          pendingReportCount?: number;
        };
        setTotal(data.total);
        setPendingReportCount(data.pendingReportCount ?? 0);
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

  const applyFilters = useCallback(() => {
    setAppliedSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    void loadHistory();
  }, [appliedSearch, loadHistory, roleFilter, statusFilter]);

  const hasMore = sessions.length < total;

  async function handleDelete(sessionId: string): Promise<void> {
    await deleteSessionAction(sessionId);
    setSessions((current) => current.filter((session) => session.id !== sessionId));
    setTotal((current) => Math.max(0, current - 1));
  }

  async function handleBackfillPendingReports() {
    setBackfilling(true);
    setBackfillError(undefined);

    try {
      const response = await fetch("/api/sessions/backfill-reports", {
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        failed?: Array<{ sessionId: string; error: string }>;
        succeeded?: number;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not generate pending reports.");
      }

      if (data.failed?.length) {
        setBackfillError(
          `${data.failed.length} report(s) could not be generated. ${data.failed[0]?.error ?? ""}`.trim(),
        );
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

        <div className="nd-filter-bar">
          <label className="nd-filter-field">
            <span className="nd-filter-label">Status</span>
            <select
              className="nd-filter-control"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="nd-filter-field">
            <span className="nd-filter-label">Role</span>
            <select
              className="nd-filter-control"
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value);
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
          <label className="nd-filter-field nd-filter-field-grow">
            <span className="nd-filter-label">Search role</span>
            <input
              className="nd-filter-control"
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
          <div className="nd-filter-field">
            <span className="nd-filter-label select-none text-transparent" aria-hidden>
              Apply
            </span>
            <Button variant="ndPrimary" className="h-10 w-full sm:w-auto" onClick={applyFilters}>
              Apply filters
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-muted-foreground">Updating results…</p>
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
            {pendingReportCount > 0 ? (
              <div className="nd-course-card mt-8 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">
                    {pendingReportCount} completed round
                    {pendingReportCount === 1 ? "" : "s"} without a report
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
            <div className="mt-4 flex flex-col gap-4">
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
