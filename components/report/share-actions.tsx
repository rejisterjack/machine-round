"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type ShareActionsProps = {
  shareToken?: string | null;
};

export function ShareActions({ shareToken }: ShareActionsProps) {
  const [copied, setCopied] = useState(false);

  if (!shareToken) {
    return (
      <div className="nd-course-card p-6">
        <div className="flex items-start gap-3">
          <Link2 className="mt-0.5 size-5 text-muted-foreground" />
          <div>
            <h2 className="font-heading text-lg font-medium">Share report</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Share links are available when your report is saved to the cloud.
              Your report is still visible on this device.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/report/share/${shareToken}`
      : `/report/share/${shareToken}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="nd-course-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link2 className="mt-0.5 size-5 text-primary" />
          <div>
            <h2 className="font-heading text-lg font-medium">Share report</h2>
            <p className="mt-2 break-all text-sm text-muted-foreground">
              {shareUrl}
            </p>
          </div>
        </div>
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
      </div>
    </div>
  );
}
