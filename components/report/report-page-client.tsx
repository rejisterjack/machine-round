"use client";

import Link from "next/link";
import { Play, RotateCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageShell } from "@/components/layout/page-shell";
import { ReadinessReport } from "@/components/report/readiness-report";
import { Button } from "@/components/ui/button";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  clearSession,
  loadSession,
  saveSession,
  type EvaluateResponse,
  type InterviewSession,
} from "@/lib/session/interview-store";
import { canUseStoredReport } from "@/lib/session/report-hydration";
import {
  canGenerateEvaluateReport,
  evaluateIneligibleMessage,
} from "@/lib/session/evaluate-eligibility";
import { scoreBadgeClass } from "@/lib/session/score-display";
import type { SessionReportData } from "@/lib/queries/reports";
import { cn } from "@/lib/utils";

function normalizeMessages(
  messages: Array<{
    role: string;
    content: string;
    speaker?: string;
  }>,
): InterviewSession["messages"] {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
      speaker:
        message.speaker === "akshay" || message.speaker === "archy"
          ? message.speaker
          : undefined,
    }));
}

function toInterviewSession(data: SessionReportData): InterviewSession {
  return {
    roleId: data.roleId ?? "",
    roleTitle: data.roleTitle,
    trackMode: "namaste_course",
    panelistMode: "both",
    interviewDuration: data.interviewDuration ?? "minutes_30",
    messages: normalizeMessages(data.messages),
    questionCount: data.questionCount,
    topicsCovered: data.topicsCovered,
    weakSignals: data.weakSignals,
    status: "complete",
    report: data.report
      ? {
          ...data.report,
          shareToken: data.shareToken ?? null,
        }
      : undefined,
    dbSessionId: data.id,
    publicId: data.publicId,
  };
}

function ReportLoadingSkeleton() {
  return (
    <div className="mt-10 space-y-8">
      <Skeleton className="h-52 w-full rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

type ReportPageClientProps = {
  initialSession?: SessionReportData | null;
};

export function ReportPageClient({ initialSession }: ReportPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get("session");
  const [session, setSession] = useState<InterviewSession | null>(() =>
    initialSession ? toInterviewSession(initialSession) : null,
  );
  const [hydrating, setHydrating] = useState(!initialSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [sessionLastError, setSessionLastError] = useState<string | undefined>(
    initialSession?.lastError ?? undefined,
  );
  const reportRequested = useRef(Boolean(initialSession?.report));
  const lastSessionParam = useRef<string | null>(sessionIdParam);

  useEffect(() => {
    if (lastSessionParam.current !== sessionIdParam) {
      lastSessionParam.current = sessionIdParam;
      reportRequested.current = false;
    }
  }, [sessionIdParam]);

  const pollEvaluateStatus = useCallback(async (sessionId: string) => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const response = await fetch(
        `/api/evaluate/status?sessionId=${encodeURIComponent(sessionId)}`,
      );
      if (!response.ok) continue;

      const data = (await response.json()) as {
        status?: string;
        report?: EvaluateResponse & { shareToken?: string | null };
        error?: string;
      };

      if (data.status === "completed" && data.report) {
        return data.report;
      }
      if (data.status === "error") {
        throw new Error(data.error ?? "Report generation failed.");
      }
    }

    throw new Error("Report generation timed out. Please retry.");
  }, []);

  const generateReport = useCallback(
    async (current: InterviewSession) => {
      if (!current.dbSessionId) {
        setError(
          "This session was not saved to the cloud. Sign in and start a new interview to generate a report.",
        );
        return;
      }

      if (!current.messages.length) {
        setError("No interview transcript found for this session.");
        return;
      }

      if (!canGenerateEvaluateReport(current.messages)) {
        setError(evaluateIneligibleMessage(current.messages));
        return;
      }

      setLoading(true);
      setError(undefined);

      try {
        const response = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roleId: current.roleId,
            roleTitle: current.roleTitle,
            messages: current.messages,
            sessionId: current.dbSessionId,
            weakSignals: current.weakSignals,
          }),
        });

        if (response.status === 202) {
          const report = await pollEvaluateStatus(current.dbSessionId);
          const updated = {
            ...current,
            report: {
              ...report,
              shareToken: report.shareToken ?? null,
            },
            status: "complete" as const,
          };
          setSession(updated);
          saveSession(updated);
          router.refresh();
          return;
        }

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error ?? "Failed to generate report.");
        }

        const report = (await response.json()) as EvaluateResponse & {
          shareToken?: string | null;
        };
        const updated = {
          ...current,
          report: {
            ...report,
            shareToken: report.shareToken ?? null,
          },
          status: "complete" as const,
        };
        setSession(updated);
        saveSession(updated);
        router.refresh();
      } catch (caught) {
        const message =
          caught instanceof Error
            ? caught.message
            : "Could not generate your readiness report. Please retry.";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [pollEvaluateStatus, router],
  );

  useEffect(() => {
    if (!sessionIdParam) return;
    if (initialSession?.id === sessionIdParam) return;
    router.refresh();
  }, [initialSession, sessionIdParam, router]);

  useEffect(() => {
    if (initialSession) return;

    let cancelled = false;

    async function hydrate() {
      const stored = loadSession();
      const dbId = sessionIdParam ?? stored?.dbSessionId;
      const storedMatchesParam =
        !sessionIdParam || stored?.dbSessionId === sessionIdParam;

      if (sessionIdParam) {
        if (!cancelled) {
          setHydrating(false);
        }
        return;
      }

      if (storedMatchesParam && canUseStoredReport(stored, sessionIdParam)) {
        if (!cancelled) {
          setSession(stored!);
          setHydrating(false);
        }
        return;
      }

      if (
        storedMatchesParam &&
        stored?.messages?.length &&
        stored.dbSessionId === dbId
      ) {
        if (!cancelled) {
          setSession(stored);
          setHydrating(false);
        }
        return;
      }

      if (!cancelled) {
        setHydrating(false);
        router.replace("/interview");
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [initialSession, router, sessionIdParam]);

  useEffect(() => {
    if (hydrating || session === null) return;

    if (session.report) {
      reportRequested.current = true;
      return;
    }

    if (reportRequested.current) return;

    if (!session.messages.length) {
      router.replace("/interview");
      return;
    }

    reportRequested.current = true;
    const timer = window.setTimeout(() => {
      void generateReport(session);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router, session, hydrating, generateReport]);

  if (hydrating || !session) {
    return (
      <PageShell glow>
        <div className="mx-auto max-w-4xl">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-8 h-10 w-80" />
          <ReportLoadingSkeleton />
        </div>
      </PageShell>
    );
  }

  const score = session.report?.overallScore;
  const displayError = session.report ? undefined : error;

  return (
    <PageShell glow>
      <div className="mx-auto max-w-4xl pb-24 lg:pb-10">
        <Breadcrumb
          items={[
            { label: "History", href: "/history" },
            { label: "Readiness report" },
          ]}
        />

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="nd-section-heading">Session complete</p>
            <h1 className="mt-2 font-heading text-3xl font-medium sm:text-4xl">
              Your readiness report
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {session.roleTitle} · AI-evaluated feedback from your Machine
              Round
            </p>
          </div>
          {score !== undefined ? (
            <div
              className={cn(
                "inline-flex shrink-0 items-center gap-2 self-start rounded-full px-4 py-2",
                scoreBadgeClass(score),
              )}
            >
              <span className="font-heading text-2xl font-semibold tabular-nums">
                {score}
              </span>
              <span className="text-xs font-medium uppercase tracking-wide opacity-80">
                /100 ready
              </span>
            </div>
          ) : null}
        </div>

        {session.publicId && session.report ? (
          <div className="nd-report-replay-banner mt-8">
            <div>
              <p className="font-heading text-base font-medium">
                Rewatch your interview
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Compare your delivery with the scores and flags below.
              </p>
            </div>
            <Button
              variant="ndPrimary"
              render={<Link href={`/replay/${session.publicId}`} />}
            >
              <Play className="size-4" />
              Open replay
            </Button>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-10 space-y-4">
            <div className="nd-course-card p-6">
              <p className="font-heading text-base font-medium">
                Generating your readiness report…
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                The evaluator agent is scoring clarity, structure, and technical
                signals from your transcript. This usually takes under 10
                seconds.
              </p>
            </div>
            <ReportLoadingSkeleton />
          </div>
        ) : displayError ? (
          <ApiErrorCard
            className="mt-10"
            message={
              sessionLastError && sessionLastError !== displayError
                ? `${displayError} ${sessionLastError}`
                : displayError
            }
            onRetry={() => void generateReport(session)}
            retryLabel="Retry report"
          />
        ) : session.report ? (
          <div className="mt-10">
            <ReadinessReport
              report={session.report}
              roleTitle={session.roleTitle}
              sessionId={session.dbSessionId}
            />
          </div>
        ) : null}

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/90 p-4 backdrop-blur-md lg:static lg:mt-12 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
            <Button
              variant="ndFilled"
              onClick={() => {
                clearSession();
                router.push("/interview");
              }}
            >
              <RotateCcw className="size-4" />
              Try another track
            </Button>
            <Button variant="ndPrimary" render={<Link href="/history" />}>
              View all rounds
            </Button>
            <Button variant="ndPrimary" render={<Link href="/" />}>
              Back to home
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
