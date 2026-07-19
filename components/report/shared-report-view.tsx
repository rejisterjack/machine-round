"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ReadinessReport } from "@/components/report/readiness-report";
import { Button } from "@/components/ui/button";
import type { SharedReportData } from "@/lib/session/shared-report-data";

const ShareActions = dynamic(
  () =>
    import("@/components/report/share-actions").then((module) => ({
      default: module.ShareActions,
    })),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted-foreground">Loading share actions…</p>
    ),
  },
);

type SharedReportViewProps = {
  report: SharedReportData;
  token: string;
};

export function SharedReportView({ report, token }: SharedReportViewProps) {
  return (
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
  );
}
