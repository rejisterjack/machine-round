"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell>
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="nd-section-heading">Something went wrong</p>
        <h1 className="mt-3 font-heading text-2xl font-medium">
          We hit an unexpected error
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Please try again. If the problem persists, return home and start a new
          round.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button variant="ndPrimary" onClick={() => reset()}>
            Try again
          </Button>
          <Button variant="ndGhost" render={<Link href="/" />}>
            Go home
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
