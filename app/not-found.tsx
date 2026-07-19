import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PageShell>
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="nd-section-heading">404</p>
        <h1 className="mt-3 font-heading text-2xl font-medium">Page not found</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          The page you requested does not exist or may have moved.
        </p>
        <Button variant="ndPrimary" className="mt-8" render={<Link href="/" />}>
          Back to home
        </Button>
      </div>
    </PageShell>
  );
}
