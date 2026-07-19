import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import { ReportPageClient } from "@/components/report/report-page-client";
import { PageShell } from "@/components/layout/page-shell";
import { auth } from "@/lib/auth/auth";
import { loadSessionReport } from "@/lib/queries/reports";


type ReportPageProps = {
  searchParams: Promise<{ session?: string }>;
};

export async function generateMetadata({
  searchParams,
}: ReportPageProps): Promise<Metadata> {
  const { session: sessionId } = await searchParams;
  if (!sessionId) {
    return { title: "Readiness report | Namaste Machine Round" };
  }

  const authSession = await auth();
  if (!authSession?.user?.id) {
    return { title: "Readiness report | Namaste Machine Round" };
  }

  const data = await loadSessionReport(sessionId, authSession.user.id);
  if (!data?.report) {
    return { title: "Readiness report | Namaste Machine Round" };
  }

  return {
    title: `${data.roleTitle} readiness (${data.report.overallScore}/100) | Namaste Machine Round`,
    description: data.report.summary.slice(0, 160),
  };
}

export default async function ReportPage({ searchParams }: ReportPageProps) {
  const { session: sessionId } = await searchParams;

  if (sessionId) {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      redirect(`/login?callbackUrl=/report?session=${sessionId}`);
    }

    const initialSession = await loadSessionReport(
      sessionId,
      authSession.user.id,
    );

    if (!initialSession) {
      notFound();
    }

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
        <ReportPageClient initialSession={initialSession} />
      </Suspense>
    );
  }

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
      <ReportPageClient />
    </Suspense>
  );
}
