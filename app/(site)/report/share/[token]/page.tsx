"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageShell } from "@/components/layout/page-shell";
import { ReadinessReport } from "@/components/report/readiness-report";
import { ShareActions } from "@/components/report/share-actions";
import { Button } from "@/components/ui/button";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { EvaluateResponse } from "@/lib/session/interview-store";

type SharedReport = EvaluateResponse & {
  roleTitle?: string;
  publicId?: string;
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
    queueMicrotask(() => void loadReport());
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
          <ApiErrorCard
            className="mt-10"
            message={error}
            onRetry={() => void loadReport()}
            retryLabel="Retry"
          />
        ) : report ? (
          <div className="mt-10">
            <ReadinessReport
              report={report}
              roleTitle={report.roleTitle}
              generatedAt={report.generatedAt}
              showShareActions={false}
            />
            <div className="mt-6 space-y-4">
              {report.publicId ? (
                <Button
                  variant="ndPrimary"
                  render={
                    <Link
                      href={`/replay/${report.publicId}?shareToken=${encodeURIComponent(token)}`}
                    />
                  }
                >
                  Watch session replay
                </Button>
              ) : null}
              <ShareActions
                shareToken={token}
                publicShareToken={token}
                report={report}
                roleTitle={report.roleTitle}
              />
            </div>
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
