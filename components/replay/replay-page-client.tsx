"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageShell } from "@/components/layout/page-shell";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import type { ReplayPayload } from "@/lib/queries/replay";

const SessionReplay = dynamic(
  () =>
    import("@/components/replay/session-replay").then((module) => ({
      default: module.SessionReplay,
    })),
  {
    ssr: false,
    loading: () => null,
  },
);

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
  const error = initialError ?? (payload ? undefined : "This session replay could not be found.");

  const loadReplay = async () => {
    router.refresh();
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Session replay" },
          ]}
        />
        <p className="nd-section-heading mb-3 mt-6">Session replay</p>
        <h1 className="font-heading text-3xl font-medium sm:text-4xl">
          Interview replay
        </h1>
        {shareToken ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Shared replay — transcript and media visible without signing in.
          </p>
        ) : null}

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
      </div>
    </PageShell>
  );
}
