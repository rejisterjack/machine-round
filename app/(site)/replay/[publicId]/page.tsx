"use client";

import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageShell } from "@/components/layout/page-shell";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  EvaluateResponse,
  InterviewMessage,
} from "@/lib/session/interview-store";
import type { ScreenCaptureItem } from "@/components/replay/screen-timeline";

const SessionReplay = dynamic(
  () =>
    import("@/components/replay/session-replay").then((module) => ({
      default: module.SessionReplay,
    })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
  },
);

type ReplayPayload = {
  id: string;
  publicId: string;
  roleTitle: string;
  panelistMode?: string;
  messages: InterviewMessage[];
  report?: EvaluateResponse & { shareToken?: string | null };
  shareToken?: string | null;
  audioRecordingUrl?: string;
  recordingDurationMs?: number;
  recordingStatus?: string | null;
  hasRecording?: boolean;
  screenCaptures?: ScreenCaptureItem[];
  screenReviewNotes?: string[];
};

function ReplayPageContent() {
  const router = useRouter();
  const params = useParams<{ publicId: string }>();
  const searchParams = useSearchParams();
  const publicId = params.publicId;
  const shareToken = searchParams.get("shareToken");
  const [payload, setPayload] = useState<ReplayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadReplay = useCallback(async () => {
    if (!publicId) return;
    setLoading(true);
    setError(undefined);

    try {
      const query = shareToken
        ? `?shareToken=${encodeURIComponent(shareToken)}`
        : "";
      const response = await fetch(`/api/sessions/replay/${publicId}${query}`);
      if (response.status === 401 || response.status === 403) {
        router.replace(
          `/login?callbackUrl=${encodeURIComponent(`/replay/${publicId}${query}`)}`,
        );
        return;
      }
      if (!response.ok) {
        throw new Error("Session not found.");
      }
      const data = (await response.json()) as ReplayPayload;
      setPayload(data);
    } catch {
      setError("This session replay could not be found.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [publicId, router, shareToken]);

  useEffect(() => {
    queueMicrotask(() => void loadReplay());
  }, [loadReplay]);

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

        {loading ? (
          <div className="mt-10 space-y-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        ) : error ? (
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

export default function ReplayPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="mx-auto max-w-4xl">
            <Skeleton className="mt-10 h-64 w-full rounded-lg" />
          </div>
        </PageShell>
      }
    >
      <ReplayPageContent />
    </Suspense>
  );
}
