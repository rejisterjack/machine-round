"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
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
import { computeQuestionCount } from "@/lib/interview/question-counter";
import {
  canGenerateEvaluateReport,
  evaluateIneligibleMessage,
} from "@/lib/session/evaluate-eligibility";

import type { InterviewDuration } from "@/lib/interview/duration-profiles";

type SessionApiResponse = {
  id: string;
  publicId: string;
  roleId?: string;
  roleTitle: string;
  interviewDuration?: InterviewDuration;
  questionCount: number;
  topicsCovered: string[];
  weakSignals: string[];
  messages: InterviewSession["messages"];
  report?: EvaluateResponse;
  shareToken?: string | null;
  lastError?: string | null;
};

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <p className="text-sm text-muted-foreground">
            Loading your Namaste Machine Round report...
          </p>
        </PageShell>
      }
    >
      <ReportPageContent />
    </Suspense>
  );
}

function ReportPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get("session");
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [sessionLastError, setSessionLastError] = useState<string>();
  const reportRequested = useRef(false);
  const lastSessionParam = useRef<string | null>(null);

  useEffect(() => {
    if (lastSessionParam.current !== sessionIdParam) {
      lastSessionParam.current = sessionIdParam;
      reportRequested.current = false;
    }
  }, [sessionIdParam]);

  const generateReport = useCallback(async (current: InterviewSession) => {
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
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Could not generate your readiness report. Please retry.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const stored = loadSession();
      const dbId = sessionIdParam ?? stored?.dbSessionId;
      const storedMatchesParam =
        !sessionIdParam || stored?.dbSessionId === sessionIdParam;

      if (storedMatchesParam && canUseStoredReport(stored, sessionIdParam)) {
        if (!cancelled) {
          setSession(stored!);
          setHydrating(false);
        }
        return;
      }

      if (dbId) {
        try {
          const response = await fetch(`/api/sessions/${dbId}`);
          if (response.ok) {
            const data = (await response.json()) as SessionApiResponse;
            const messages = data.messages?.length
              ? data.messages
              : storedMatchesParam
                ? (stored?.messages ?? [])
                : [];

            if (messages.length > 0) {
              const hydrated: InterviewSession = {
                roleId:
                  data.roleId ??
                  (storedMatchesParam && stored?.roleId ? stored.roleId : ""),
                roleTitle: data.roleTitle ?? stored?.roleTitle ?? "Interview",
                trackMode: stored?.trackMode ?? "namaste_course",
                panelistMode: stored?.panelistMode ?? "both",
                interviewDuration:
                  data.interviewDuration ??
                  stored?.interviewDuration ??
                  "minutes_30",
                messages,
                questionCount: computeQuestionCount(messages),
                topicsCovered:
                  data.topicsCovered ?? stored?.topicsCovered ?? [],
                weakSignals: data.weakSignals ?? stored?.weakSignals ?? [],
                status: "complete",
                report: data.report
                  ? {
                      ...data.report,
                      shareToken: data.shareToken ?? null,
                    }
                  : undefined,
                dbSessionId: dbId,
                publicId: data.publicId ?? stored?.publicId,
              };
              if (!cancelled) {
                setSession(hydrated);
                setSessionLastError(data.lastError ?? undefined);
                saveSession(hydrated);
                setHydrating(false);
                if (hydrated.report) {
                  reportRequested.current = true;
                }
              }
              return;
            }
          }
        } catch {
          // Fall through to sessionStorage or redirect.
        }
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
  }, [router, sessionIdParam]);

  useEffect(() => {
    if (hydrating || session === null) return;
    if (!session.messages.length) {
      router.replace("/interview");
      return;
    }
    if (session.report || reportRequested.current) return;
    reportRequested.current = true;
    void generateReport(session);
  }, [router, session, hydrating, generateReport]);

  if (hydrating || !session) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">
          Loading your Namaste Machine Round report...
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl">
        <Breadcrumb items={[{ label: "Readiness report" }]} />
        <p className="nd-section-heading mb-3 mt-6">Your readiness report</p>
        <h1 className="font-heading text-3xl font-medium sm:text-4xl">
          Your Namaste Machine Round readiness
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{session.roleTitle}</p>

        {loading ? (
          <div className="mt-10 space-y-4">
            <p className="text-sm text-muted-foreground">
              Generating your Namaste Machine Round readiness report...
            </p>
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>
        ) : error ? (
          <ApiErrorCard
            className="mt-10"
            message={sessionLastError ? `${error} ${sessionLastError}` : error}
            onRetry={() => void generateReport(session)}
            retryLabel="Retry report"
          />
        ) : session.report ? (
          <div className="mt-10">
            {session.publicId ? (
              <p className="mb-4 text-sm text-muted-foreground">
                Replay this session:{" "}
                <Link
                  href={`/replay/${session.publicId}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  /replay/{session.publicId}
                </Link>
              </p>
            ) : null}
            <ReadinessReport
              report={session.report}
              roleTitle={session.roleTitle}
              sessionId={session.dbSessionId}
            />
          </div>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-3">
          <Button
            variant="ndFilled"
            onClick={() => {
              clearSession();
              router.push("/interview");
            }}
          >
            Try another track
          </Button>
          <Button variant="ndPrimary" render={<Link href="/history" />}>
            View all my rounds
          </Button>
          <Button variant="ndPrimary" render={<Link href="/" />}>
            Back to home
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
