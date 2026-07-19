"use client";

import { Check, Copy, Download, Link2, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { EvaluateResponse } from "@/lib/session/interview-store";

type ShareActionsProps = {
  shareToken?: string | null;
  report?: EvaluateResponse;
  roleTitle?: string;
  sessionId?: string;
  /** When set, PDF downloads via the public share route (no auth). */
  publicShareToken?: string;
};

export function ShareActions({
  shareToken,
  report,
  roleTitle,
  sessionId,
  publicShareToken,
}: ShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string>();

  const shareUrl =
    shareToken && typeof window !== "undefined"
      ? `${window.location.origin}/report/share/${shareToken}`
      : shareToken
        ? `/report/share/${shareToken}`
        : null;

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const canDownloadPdf = Boolean(sessionId || publicShareToken);

  async function downloadPdf() {
    if (!canDownloadPdf) return;
    setDownloading(true);
    setDownloadError(undefined);

    try {
      const response = publicShareToken
        ? await fetch(`/api/reports/share/${publicShareToken}/pdf`)
        : await fetch("/api/reports/pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, roleTitle }),
          });

      if (!response.ok) {
        throw new Error("PDF generation failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "namaste-machine-round-report.pdf";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Could not download PDF right now. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="nd-course-card overflow-hidden p-0">
      <div className="border-b border-border/60 bg-gradient-to-r from-primary/10 via-card to-card px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/15 p-2 text-primary">
            <Share2 className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-lg font-medium">Share & export</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Send your readiness report to a mentor or save a PDF for your prep
              notes.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-6">
        {shareUrl ? (
          <div className="rounded-xl border border-border/70 bg-secondary/20 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Link2 className="size-3.5" />
              Public link
            </div>
            <p className="break-all text-sm text-foreground/90">{shareUrl}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {canDownloadPdf
              ? "Share links appear once your report is saved to the cloud."
              : "Share links and PDF export require a cloud-saved report."}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {shareUrl ? (
            <Button variant="ndPrimary" onClick={() => void copyLink()}>
              {copied ? (
                <>
                  <Check className="size-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  Copy link
                </>
              )}
            </Button>
          ) : null}
          {canDownloadPdf ? (
            <Button
              variant="ndFilled"
              disabled={downloading}
              onClick={() => void downloadPdf()}
            >
              <Download className="size-4" />
              {downloading ? "Generating..." : "Download PDF"}
            </Button>
          ) : null}
        </div>

        {report?.overallScore !== undefined ? (
          <p className="text-xs text-muted-foreground">
            PDF includes your {report.overallScore}/100 score, per-answer
            breakdown, and improvement actions.
          </p>
        ) : null}

        {downloadError ? (
          <p className="text-xs text-destructive">{downloadError}</p>
        ) : null}
      </div>
    </div>
  );
}
