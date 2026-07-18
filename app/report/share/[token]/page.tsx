"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageShell } from "@/components/layout/page-shell";
import { ReadinessReport } from "@/components/report/readiness-report";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { EvaluateResponse } from "@/lib/session/interview-store";

type SharedReport = EvaluateResponse & {
  roleTitle?: string;
  generatedAt?: string;
  shareToken?: string | null;
};

export default function SharedReportPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [report, setReport] = useState<SharedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadReport = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(undefined);

    try {
      const response = await fetch(`/api/reports/share/${token}`);
      if (!response.ok) {
        throw new Error("Report not found.");
      }
      const data = (await response.json()) as SharedReport;
      setReport({ ...data, shareToken: token });
    } catch {
      setError("This shared report could not be found or has expired.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Shared report" },
          ]}
        />
        <p className="nd-section-heading mb-3 mt-6">Shared readiness report</p>
        <h1 className="font-heading text-3xl font-medium sm:text-4xl">
          Namaste Machine Round readiness
        </h1>

        {loading ? (
          <div className="mt-10 space-y-4">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>
        ) : error ? (
          <div className="nd-course-card mt-10 p-6">
            <p className="text-sm text-destructive">{error}</p>
            <div className="mt-4 flex gap-3">
              <Button variant="ndPrimary" onClick={() => void loadReport()}>
                Retry
              </Button>
              <Button variant="ndGhost" render={<Link href="/interview" />}>
                Start a round
              </Button>
            </div>
          </div>
        ) : report ? (
          <div className="mt-10">
            <ReadinessReport
              report={report}
              roleTitle={report.roleTitle}
              generatedAt={report.generatedAt}
              showShareActions={false}
            />
          </div>
        ) : null}

        <div className="mt-10">
          <Button variant="ndFilled" render={<Link href="/interview" />}>
            Start your own round
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
