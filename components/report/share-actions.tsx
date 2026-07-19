"use client";

import { Check, Copy, Download, Link2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { EvaluateResponse } from "@/lib/session/interview-store";

type ShareActionsProps = {
  shareToken?: string | null;
  report?: EvaluateResponse;
  roleTitle?: string;
  /** When set, PDF downloads via the public share route (no auth). */
  publicShareToken?: string;
};

export function ShareActions({
  shareToken,
  report,
  roleTitle,
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

  async function downloadPdf() {
    if (!report && !publicShareToken) return;
    setDownloading(true);
    setDownloadError(undefined);

    try {
      const response = publicShareToken
        ? await fetch(`/api/reports/share/${publicShareToken}/pdf`)
        : await fetch("/api/reports/pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...report, roleTitle }),
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
    <div className="nd-course-card p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <Link2 className="mt-0.5 size-5 text-primary" />
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-lg font-medium">Share & export</h2>
            {shareUrl ? (
              <p className="mt-2 break-all text-sm text-muted-foreground">
                {shareUrl}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Share links are available when your report is saved to the cloud.
                You can still download a PDF from this device.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
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
          {report || publicShareToken ? (
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

        {downloadError ? (
          <p className="text-xs text-destructive">{downloadError}</p>
        ) : null}
      </div>
    </div>
  );
}
