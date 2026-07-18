"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

      const report = (await response.json()) as EvaluateResponse;
      const updated = { ...current, report, status: "complete" as const };
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
          <div className="nd-course-card mt-10 p-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              className="mt-4"
              variant="ndPrimary"
              onClick={() => void generateReport(session)}
            >
              Retry report
            </Button>
          </div>
        ) : session.report ? (
          <div className="mt-10 space-y-6">
            <div className="nd-course-card border-primary/20 p-6">
              <p className="nd-section-heading">Overall readiness</p>
              <p className="mt-2 font-heading text-5xl text-primary">
                {session.report.overallScore}
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                {session.report.summary}
              </p>
              <div className="mt-4">
                <Progress value={session.report.overallScore} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {session.report.answers.map((answer, index) => (
                <div key={index} className="nd-stat-chip text-left">
                  <p className="text-xs text-muted-foreground">Answer {index + 1}</p>
                  <p className="mt-1 text-sm font-medium">Clarity {answer.clarity}</p>
                  <p className="text-sm text-muted-foreground">
                    Structure {answer.structure}
                  </p>
                </div>
              ))}
            </div>

            {session.report.answers.map((answer, index) => (
              <div key={`detail-${index}`} className="nd-course-card p-6">
                <h2 className="font-heading text-base font-medium">
                  {answer.question}
                </h2>
                <div className="mt-4 space-y-3 text-sm">
                  <p className="text-muted-foreground">{answer.answer}</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="nd-stat-chip">Clarity: {answer.clarity}</div>
                    <div className="nd-stat-chip">
                      Structure: {answer.structure}
                    </div>
                    <div className="nd-stat-chip">
                      Technical: {answer.technicalSignal}
                    </div>
                  </div>
                  {answer.redFlags.length > 0 ? (
                    <ul className="list-disc pl-5 text-primary">
                      {answer.redFlags.map((flag) => (
                        <li key={flag}>{flag}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            ))}

            <div className="nd-course-card p-6">
              <h2 className="font-heading text-lg font-medium">
                Improvement actions
              </h2>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                {session.report.improvements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
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
