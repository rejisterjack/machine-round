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

type HistorySession = {
  id: string;
  publicId: string;
  roleTitle: string;
  panelistMode: string;
  status: string;
  questionCount: number;
  overallScore: number | null;
  startedAt: string;
  completedAt: string | null;
  hasRecording: boolean;
  recordingStatus: string | null;
  snapshotCount: number;
};

const PAGE_SIZE = 20;

export default function HistoryPage() {
  const { status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>();

  const loadHistory = useCallback(
    async (offset = 0, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(undefined);

      try {
        const response = await fetch(
          `/api/sessions/mine?limit=${PAGE_SIZE}&offset=${offset}`,
        );
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
    [router],
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/history");
      return;
    }
    if (status === "authenticated") {
      void loadHistory();
    }
  }, [status, router, loadHistory]);

  const hasMore = sessions.length < total;

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
              No Machine Rounds yet. Complete a signed-in interview to see it
              here.
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
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {sessions.map((session) => (
                <SessionHistoryCard
                  key={session.id}
                  {...session}
                  onRecordingRetry={() => void loadHistory()}
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
