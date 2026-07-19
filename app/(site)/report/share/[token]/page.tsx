import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SharedReportView } from "@/components/report/shared-report-view";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { loadSharedReportData } from "@/lib/session/shared-report-data";

type SharedReportPageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({
  params,
}: SharedReportPageProps): Promise<Metadata> {
  const { token } = await params;
  const report = await loadSharedReportData(token);

  if (!report) {
    return {
      title: "Report not found | Namaste Machine Round",
      description: "This shared readiness report could not be found or has expired.",
    };
  }

  const title = `${report.roleTitle} Readiness Report | Namaste Machine Round`;

  return {
    title,
    description: `Overall readiness score: ${report.overallScore}/100. ${report.summary.slice(0, 140)}`,
    openGraph: {
      title: `${report.roleTitle} — ${report.overallScore}/100 readiness`,
      description: report.summary.slice(0, 200),
      type: "article",
    },
  };
}

export default async function SharedReportPage({ params }: SharedReportPageProps) {
  const { token } = await params;
  const report = await loadSharedReportData(token);

  if (!report) {
    notFound();
  }

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

        <SharedReportView report={report} token={token} />

        <div className="mt-10">
          <Button variant="ndFilled" render={<Link href="/interview" />}>
            Start your own round
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
