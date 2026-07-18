import Link from "next/link";
import { CodexTerminal } from "@/components/brand/codex-terminal";
import { ReadinessReport } from "@/components/report/readiness-report";
import { Button } from "@/components/ui/button";
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
      </div>

      <CodexTerminal title="Session transcript">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={
                message.role === "assistant"
                  ? "nd-message-assistant"
                  : "nd-message-user"
              }
            >
              {message.content}
            </div>
          ))}
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
