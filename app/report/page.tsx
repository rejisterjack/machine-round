"use client";

import Link from "next/link";
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

export default function ReportPage() {
  const router = useRouter();
  const [session, setSession] = useState<InterviewSession | null>(() =>
    typeof window !== "undefined" ? loadSession() : null,
  );
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    const existing = loadSession();
    return existing ? !existing.report : true;
  });
  const [error, setError] = useState<string>();
  const reportRequested = useRef(false);

  const generateReport = useCallback(async (current: InterviewSession) => {
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
        throw new Error("Failed to generate report.");
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
    } catch {
      setError("Could not generate your readiness report. Please retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session === null) {
      router.replace("/interview");
      return;
    }
    if (!session.messages.length) {
      router.replace("/interview");
      return;
    }
    if (session.report || reportRequested.current) return;
    reportRequested.current = true;
    void generateReport(session);
  }, [router, session, generateReport]);

  if (!session) {
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
            message={error}
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
            <ReadinessReport report={session.report} />
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
          <Button variant="ndPrimary" render={<Link href="/" />}>
            Back to home
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
