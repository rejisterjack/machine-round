import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReplayPageClient } from "@/components/replay/replay-page-client";
import { auth } from "@/lib/auth/auth";
import { loadReplayPayload } from "@/lib/queries/replay";
import { ApiError } from "@/lib/api/errors";

type ReplayPageProps = {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ shareToken?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: ReplayPageProps): Promise<Metadata> {
  const { publicId } = await params;
  const { shareToken } = await searchParams;

  try {
    const authSession = shareToken ? null : await auth();
    const payload = await loadReplayPayload({
      publicId,
      shareToken: shareToken ?? null,
      userId: authSession?.user?.id,
    });

    if (payload) {
      const scoreSuffix =
        payload.report?.overallScore != null
          ? ` (${payload.report.overallScore}/100)`
          : "";
      return {
        title: `${payload.roleTitle} replay${scoreSuffix} | Namaste Machine Round`,
        description: payload.report?.summary?.slice(0, 160),
      };
    }
  } catch {
    // Fall through to generic title when payload is unavailable.
  }

  return {
    title: `Session replay ${publicId} | Namaste Machine Round`,
  };
}

export default async function ReplayPage({
  params,
  searchParams,
}: ReplayPageProps) {
  const { publicId } = await params;
  const { shareToken } = await searchParams;

  let payload = null;
  let error: string | undefined;

  try {
    const authSession = shareToken ? null : await auth();
    payload = await loadReplayPayload({
      publicId,
      shareToken: shareToken ?? null,
      userId: authSession?.user?.id,
    });

    if (!payload && !shareToken && !authSession?.user?.id) {
      redirect(
        `/login?callbackUrl=${encodeURIComponent(`/replay/${publicId}`)}`,
      );
    }
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 401) {
      redirect(
        `/login?callbackUrl=${encodeURIComponent(
          `/replay/${publicId}${shareToken ? `?shareToken=${shareToken}` : ""}`,
        )}`,
      );
    }
    error = "This session replay could not be found.";
  }

  return (
    <ReplayPageClient
      initialPayload={payload}
      shareToken={shareToken ?? null}
      error={error}
    />
  );
}
