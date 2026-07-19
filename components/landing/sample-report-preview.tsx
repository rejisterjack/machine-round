"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ReadinessReport } from "@/components/report/readiness-report";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { EvaluateResponse } from "@/lib/session/interview-store";

type SharedPreview = EvaluateResponse & {
  roleTitle?: string;
  generatedAt?: string;
};

export function SampleReportPreview() {
  const token = process.env.NEXT_PUBLIC_DEMO_SHARE_TOKEN?.trim();
  const [report, setReport] = useState<SharedPreview | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!token) return;

    void (async () => {
      try {
        const response = await fetch(`/api/reports/share/${token}`);
        if (!response.ok) {
          throw new Error("Sample report unavailable.");
        }
        setReport((await response.json()) as SharedPreview);
      } catch {
        setError("Sample report preview is not configured yet.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (!token) {
    return (
      <div className="nd-course-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Sign in with Google to run a voice interview and receive your
          readiness report. History, replay, and media archive require an
          account.
        </p>
        <Button variant="ndPrimary" className="mt-4" render={<Link href="/login?callbackUrl=/interview" />}>
          Start with Google
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="nd-course-card p-6 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="ndPrimary" className="mt-4" render={<Link href="/login?callbackUrl=/interview" />}>
          Start with Google
        </Button>
      </div>
    );
  }

  return (
    <div>
      <ReadinessReport
        report={report}
        roleTitle={report.roleTitle}
        generatedAt={report.generatedAt}
        showShareActions={false}
      />
      <div className="mt-6 text-center">
        <Button variant="ndFilled" render={<Link href="/login?callbackUrl=/interview" />}>
          Start your own Machine Round
        </Button>
      </div>
    </div>
  );
}
