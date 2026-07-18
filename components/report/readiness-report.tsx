import { Progress } from "@/components/ui/progress";
import { ShareActions } from "@/components/report/share-actions";
import { WeakTopicsCloud } from "@/components/report/weak-topics-cloud";
import type { EvaluateResponse } from "@/lib/session/interview-store";

type ReadinessReportProps = {
  report: EvaluateResponse & { shareToken?: string | null };
  roleTitle?: string;
  generatedAt?: string;
  showShareActions?: boolean;
};

export function ReadinessReport({
  report,
  roleTitle,
  generatedAt,
  showShareActions = true,
}: ReadinessReportProps) {
  return (
    <div className="space-y-6">
      <div className="nd-course-card border-primary/20 p-6">
        <p className="nd-section-heading">Overall readiness</p>
        <p className="mt-2 font-heading text-5xl text-primary">
          {report.overallScore}
        </p>
        {roleTitle ? (
          <p className="mt-2 text-sm text-muted-foreground">{roleTitle}</p>
        ) : null}
        {generatedAt ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Generated {new Date(generatedAt).toLocaleString()}
          </p>
        ) : null}
        <p className="mt-4 text-sm text-muted-foreground">{report.summary}</p>
        <div className="mt-4">
          <Progress value={report.overallScore} />
        </div>
      </div>

      <WeakTopicsCloud topics={report.weakTopics ?? []} />
      {showShareActions ? (
        <ShareActions shareToken={report.shareToken} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {report.answers.map((answer, index) => (
          <div key={index} className="nd-stat-chip text-left">
            <p className="text-xs text-muted-foreground">Answer {index + 1}</p>
            <p className="mt-1 text-sm font-medium">Clarity {answer.clarity}</p>
            <p className="text-sm text-muted-foreground">
              Structure {answer.structure}
            </p>
          </div>
        ))}
      </div>

      {report.answers.map((answer, index) => (
        <div key={`detail-${index}`} className="nd-course-card p-6">
          <h2 className="font-heading text-base font-medium">
            {answer.question}
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-muted-foreground">{answer.answer}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="nd-stat-chip">Clarity: {answer.clarity}</div>
              <div className="nd-stat-chip">Structure: {answer.structure}</div>
              <div className="nd-stat-chip">
                Technical: {answer.technicalSignal}
              </div>
            </div>
            {answer.redFlags.length > 0 ? (
              <ul className="list-disc pl-5 text-primary">
                {answer.redFlags.map((flag) => (
                  <li key={flag}>{flag}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ))}

      <div className="nd-course-card p-6">
        <h2 className="font-heading text-lg font-medium">Improvement actions</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          {report.improvements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
