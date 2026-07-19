"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, RotateCcw } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageShell } from "@/components/layout/page-shell";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { scoreBadgeClass } from "@/lib/session/score-display";
import type { ReplayPayload } from "@/lib/queries/replay";
import { cn } from "@/lib/utils";

const SessionReplay = dynamic(
  () =>
    import("@/components/replay/session-replay").then((module) => ({
      default: module.SessionReplay,
    })),
  {
    ssr: false,
    loading: () => <ReplayContentSkeleton />,
  },
);

function ReplayContentSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-52 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

type ReplayPageClientProps = {
  initialPayload: ReplayPayload | null;
  shareToken?: string | null;
  error?: string;
};

export function ReplayPageClient({
  initialPayload,
  shareToken,
  error: initialError,
}: ReplayPageClientProps) {
  const router = useRouter();
  const payload = initialPayload;
  const error =
    initialError ??
    (payload ? undefined : "This session replay could not be found.");

  const loadReplay = async () => {
    router.refresh();
  };

  const score = payload?.report?.overallScore;

  return (
    <PageShell glow>
      <div className="mx-auto max-w-4xl pb-24 lg:pb-10">
        <Breadcrumb
          items={[
            { label: "History", href: "/history" },
            { label: "Session replay" },
          ]}
        />

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="nd-section-heading">Interview replay</p>
            <h1 className="mt-2 font-heading text-3xl font-medium sm:text-4xl">
              Session replay
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {payload?.roleTitle ?? "Machine Round session"} · transcript,
              recording, and screen captures
            </p>
            {shareToken ? (
              <p className="mt-2 text-sm text-primary/90">
                Shared replay — visible without signing in.
              </p>
            ) : null}
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

        {error ? (
          <ApiErrorCard
            className="mt-10"
            message={error}
            onRetry={() => void loadReplay()}
          />
        ) : payload ? (
          <div className="mt-10">
            <SessionReplay
              sessionId={payload.id}
              roleTitle={payload.roleTitle}
              messages={payload.messages}
              report={payload.report}
              shareToken={payload.shareToken ?? shareToken}
              publicId={payload.publicId}
              panelistMode={payload.panelistMode}
              questionCount={payload.questionCount}
              audioRecordingUrl={payload.audioRecordingUrl}
              recordingDurationMs={payload.recordingDurationMs}
              recordingStatus={payload.recordingStatus}
              hasRecording={payload.hasRecording}
              screenCaptures={payload.screenCaptures}
              screenReviewNotes={payload.screenReviewNotes}
              readOnly={Boolean(shareToken)}
              onRecordingRetry={() => void loadReplay()}
            />
          </div>
        ) : null}

        {payload ? (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/90 p-4 backdrop-blur-md lg:static lg:mt-12 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
              {payload.report ? (
                <Button
                  variant="ndFilled"
                  render={
                    <Link href={`/report?session=${payload.id}`} />
                  }
                >
                  <FileText className="size-4" />
                  View report
                </Button>
              ) : null}
              {!shareToken ? (
                <Button
                  variant="ndPrimary"
                  onClick={() => router.push("/interview")}
                >
                  <RotateCcw className="size-4" />
                  Try another track
                </Button>
              ) : null}
              <Button variant="ndPrimary" render={<Link href="/history" />}>
                All rounds
              </Button>
              <Button variant="ndPrimary" render={<Link href="/" />}>
                Back to home
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
