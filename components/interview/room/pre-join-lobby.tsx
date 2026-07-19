"use client";

import { Loader2 } from "lucide-react";
import { PanelistAvatar } from "@/components/interview/panelist-avatar";
import { Button } from "@/components/ui/button";
import {
  getActivePanelists,
  getPanelistModeLabel,
  type PanelistMode,
} from "@/lib/ai/personas/panelists";
import { ndColors } from "@/lib/design/tokens";

type PreJoinLobbyProps = {
  roleTitle: string;
  panelistMode: PanelistMode;
  joining: boolean;
  error?: string;
  onJoin: () => void;
  onRetryMic?: () => void;
  canResume?: boolean;
  onResume?: () => void;
};

export function PreJoinLobby({
  roleTitle,
  panelistMode,
  joining,
  error,
  onJoin,
  onRetryMic,
  canResume = false,
  onResume,
}: PreJoinLobbyProps) {
  const panelists = getActivePanelists(panelistMode);

  return (
    <div
      className="flex h-dvh w-full flex-col items-center justify-center px-6"
      style={{ backgroundColor: ndColors.bg }}
    >
      <p className="nd-section-heading mb-2">Ready to join?</p>
      <h1 className="text-center font-heading text-2xl font-medium sm:text-3xl">
        {getPanelistModeLabel(panelistMode)}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{roleTitle}</p>

      <div className="mt-8 flex items-center gap-4">
        {panelists.map((id) => (
          <PanelistAvatar key={id} panelistId={id} className="size-16" />
        ))}
      </div>

      <p className="mt-8 max-w-md text-center text-sm text-muted-foreground">
        Your microphone will be used for this voice-only interview. Camera and
        screen share are optional.
      </p>

      {error ? (
        <div className="mt-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          {onRetryMic ? (
            <Button variant="outline" size="sm" className="mt-3" onClick={onRetryMic}>
              Retry microphone
            </Button>
          ) : null}
        </div>
      ) : null}

      <Button
        variant={canResume ? "outline" : "ndFilled"}
        size="lg"
        className="mt-10 min-w-48"
        disabled={joining || canResume}
        onClick={onJoin}
      >
        {joining ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Joining…
          </>
        ) : (
          "Join interview"
        )}
      </Button>

      {canResume && onResume ? (
        <Button
          variant="ndFilled"
          size="lg"
          className="mt-4 min-w-48"
          disabled={joining}
          onClick={onResume}
        >
          Resume in-progress session
        </Button>
      ) : null}
    </div>
  );
}
