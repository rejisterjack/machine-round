"use client";

import { FileText, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiErrorCard } from "@/components/ui/api-error-card";
import type { JobInterviewPlan } from "@/lib/courses/jd-rounds";

type JobDescriptionPanelProps = {
  onPlanReady: (plan: JobInterviewPlan, summary: string) => void;
};

export function JobDescriptionPanel({ onPlanReady }: JobDescriptionPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function handlePlan(source: "text" | "file", file?: File) {
    setLoading(true);
    setError(undefined);

    try {
      let response: Response;

      if (source === "file" && file) {
        const formData = new FormData();
        formData.append("file", file);
        if (text.trim()) formData.append("text", text.trim());
        response = await fetch("/api/interview/plan-jd", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/interview/plan-jd", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.trim() }),
        });
      }

      if (response.status === 401) {
        throw new Error("Sign in to plan interviews from a job description.");
      }
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Could not plan interview rounds.");
      }

      const data = (await response.json()) as {
        plan: JobInterviewPlan;
        jobDescriptionSummary: string;
      };
      onPlanReady(data.plan, data.jobDescriptionSummary);
    } catch (planError) {
      setError(
        planError instanceof Error
          ? planError.message
          : "Could not plan interview rounds.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="nd-course-card mt-8 p-6">
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 size-5 text-primary" />
        <div className="flex-1">
          <h2 className="font-heading text-xl font-medium">
            Practice from a job description
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Paste or upload a JD (.txt, .md, .pdf). We will plan the interview
            rounds for that role so you can practice each one.
          </p>
        </div>
      </div>

      <textarea
        className="mt-6 min-h-40 w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm"
        placeholder="Paste the job description here — role, requirements, responsibilities..."
        value={text}
        onChange={(event) => setText(event.target.value)}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.markdown,.pdf,.json,.csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handlePlan("file", file);
            event.target.value = "";
          }}
        />
        <Button
          variant="ndPrimary"
          disabled={loading || text.trim().length < 80}
          onClick={() => void handlePlan("text")}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Planning rounds...
            </>
          ) : (
            "Plan interview rounds"
          )}
        </Button>
        <Button
          variant="ndGhost"
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-2 size-4" />
          Upload file
        </Button>
      </div>

      {error ? (
        <ApiErrorCard
          className="mt-4"
          message={error}
          onRetry={() => setError(undefined)}
        />
      ) : null}
    </div>
  );
}
