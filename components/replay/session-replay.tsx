import Link from "next/link";
import { CodexTerminal } from "@/components/brand/codex-terminal";
import { ReadinessReport } from "@/components/report/readiness-report";
import { PanelistAvatar } from "@/components/interview/panelist-avatar";
import { Button } from "@/components/ui/button";
import { getPanelist } from "@/lib/ai/personas/panelists";
import type { EvaluateResponse, InterviewMessage } from "@/lib/session/interview-store";

type SessionReplayProps = {
  roleTitle: string;
  messages: InterviewMessage[];
  report?: EvaluateResponse & { shareToken?: string | null };
  shareToken?: string | null;
  publicId: string;
};

export function SessionReplay({
  roleTitle,
  messages,
  report,
  shareToken,
  publicId,
}: SessionReplayProps) {
  return (
    <div className="space-y-8">
      <div className="nd-course-card p-4">
        <p className="text-sm text-muted-foreground">Replay ID</p>
        <p className="mt-1 font-mono text-sm">{publicId}</p>
        <p className="mt-3 text-sm text-muted-foreground">{roleTitle}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Panel: Akshay Saini & Archy Gupta
        </p>
      </div>

      <CodexTerminal title="Session transcript">
        <div className="space-y-4">
          {messages.map((message, index) =>
            message.role === "assistant" ? (
              <div key={`${message.role}-${index}`} className="flex gap-3">
                <PanelistAvatar
                  panelistId={message.speaker ?? "akshay"}
                  className="size-8"
                />
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    {getPanelist(message.speaker ?? "akshay").name}
                  </p>
                  <div className="nd-message-assistant">{message.content}</div>
                </div>
              </div>
            ) : (
              <div key={`${message.role}-${index}`} className="nd-message-user">
                {message.content}
              </div>
            ),
          )}
        </div>
      </CodexTerminal>

      {report ? (
        <div>
          <h2 className="mb-4 font-heading text-xl font-medium">
            Readiness report
          </h2>
          <ReadinessReport
            report={{ ...report, shareToken: shareToken ?? report.shareToken }}
            roleTitle={roleTitle}
            showShareActions={Boolean(shareToken ?? report.shareToken)}
          />
        </div>
      ) : null}

      {shareToken ? (
        <Button variant="ndPrimary" render={<Link href={`/report/share/${shareToken}`} />}>
          Open shared report
        </Button>
      ) : null}
    </div>
  );
}
