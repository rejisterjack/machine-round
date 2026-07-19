"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

const errorMessages: Record<string, string> = {
  OAuthSignin: "Could not start Google sign-in. Please try again.",
  OAuthCallback: "Google sign-in failed. Please try again.",
  OAuthAccountNotLinked:
    "This email is already linked to another sign-in method.",
  Default: "Something went wrong during sign-in. Please try again.",
};

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/interview";
  const error = searchParams.get("error");
  const errorMessage = error
    ? (errorMessages[error] ?? errorMessages.Default)
    : null;

  return (
    <PageShell glow className="min-h-[calc(100vh-8rem)]">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <p className="nd-section-heading">Account</p>
        <h1 className="mt-3 font-heading text-2xl font-medium sm:text-3xl">
          Sign in to start your{" "}
          <span className="nd-gradient-text">Machine Round</span>
        </h1>
        <p className="mt-4 text-sm text-muted-foreground sm:text-base">
          Google sign-in is required to run an interview and save your session
          progress.
        </p>

        {errorMessage ? (
          <p
            className="mt-6 w-full rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <Button
          type="button"
          variant="ndPrimary"
          size="lg"
          className="mt-8 w-full"
          onClick={() => signIn("google", { callbackUrl })}
        >
          <span className="nd-cta-dot" aria-hidden />
          Sign in with Google
        </Button>
      </div>
    </PageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        </PageShell>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
