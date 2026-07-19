"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageShell } from "@/components/layout/page-shell";
import { SessionReplay } from "@/components/replay/session-replay";
import { Button } from "@/components/ui/button";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  EvaluateResponse,
  InterviewMessage,
} from "@/lib/session/interview-store";
import type { ScreenCaptureItem } from "@/components/replay/screen-timeline";

type ReplayPayload = {
  publicId: string;
  roleTitle: string;
  panelistMode?: string;
  messages: InterviewMessage[];
  report?: EvaluateResponse & { shareToken?: string | null };
  shareToken?: string | null;
  audioRecordingUrl?: string;
  recordingDurationMs?: number;
  screenCaptures?: ScreenCaptureItem[];
  screenReviewNotes?: string[];
};

export default function ReplayPage() {
  const router = useRouter();
  const params = useParams<{ publicId: string }>();
  const publicId = params.publicId;
  const [payload, setPayload] = useState<ReplayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadReplay = useCallback(async () => {
    if (!publicId) return;
    setLoading(true);
    setError(undefined);

    try {
      const response = await fetch(`/api/sessions/replay/${publicId}`);
      if (response.status === 401 || response.status === 403) {
        router.replace(`/login?callbackUrl=${encodeURIComponent(`/replay/${publicId}`)}`);
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
  }, [publicId, router]);

  useEffect(() => {
    void loadReplay();
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
              roleTitle={payload.roleTitle}
              messages={payload.messages}
              report={payload.report}
              shareToken={payload.shareToken}
              publicId={payload.publicId}
              panelistMode={payload.panelistMode}
              audioRecordingUrl={payload.audioRecordingUrl}
              recordingDurationMs={payload.recordingDurationMs}
              screenCaptures={payload.screenCaptures}
              screenReviewNotes={payload.screenReviewNotes}
            />
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
