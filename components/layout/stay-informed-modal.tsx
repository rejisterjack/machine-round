"use client";

import { useSession } from "next-auth/react";
import { Mail, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const DISMISS_KEY = "namaste-machine-round-stay-informed-dismissed";
const SESSION_KEY = "namaste-machine-round-stay-informed-session";

/** Marketing pages only — never interrupt interview, report, or auth flows. */
const PROMO_PATHS = new Set(["/", "/demo-video"]);

const SHOW_DELAY_MS = 12_000;

const fieldClassName =
  "h-11 rounded-xl border border-border bg-secondary px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50";

export function StayInformedModal() {
  const pathname = usePathname();
  const { status: authStatus } = useSession();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [formStatus, setFormStatus] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");

  const canPromote =
    PROMO_PATHS.has(pathname) &&
    authStatus !== "loading" &&
    authStatus !== "authenticated";

  useEffect(() => {
    if (!canPromote) {
      setOpen(false);
      return;
    }

    if (localStorage.getItem(DISMISS_KEY) || sessionStorage.getItem(SESSION_KEY)) {
      return;
    }

    const timer = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [canPromote]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismissSession();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function dismissSession() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setOpen(false);
  }

  function dismissPermanent() {
    localStorage.setItem(DISMISS_KEY, "1");
    sessionStorage.setItem(SESSION_KEY, "1");
    setOpen(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || formStatus === "loading") return;

    setFormStatus("loading");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          resourcePreference: "Namaste Machine Round updates",
        }),
      });
      if (!response.ok) throw new Error("Newsletter signup failed.");
      setFormStatus("done");
      window.setTimeout(dismissPermanent, 1500);
    } catch {
      setFormStatus("error");
    }
  }

  if (!open) return null;

  const isDisabled = formStatus === "loading" || formStatus === "done";

  return (
    <aside
      role="dialog"
      aria-labelledby="stay-informed-title"
      aria-live="polite"
      className="fixed bottom-20 left-4 z-50 w-[min(100%,22rem)] animate-in slide-in-from-bottom-4 fade-in duration-300 sm:bottom-6 sm:left-6"
    >
      <div className="rounded-xl border border-border bg-card/95 p-4 shadow-2xl ring-1 ring-white/10 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Mail className="size-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p id="stay-informed-title" className="font-heading text-sm font-medium">
                Stay informed
              </p>
              <button
                type="button"
                onClick={dismissPermanent}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                aria-label="Dismiss newsletter prompt"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Free interview prep resources and Machine Round updates in your inbox.
            </p>
          </div>
        </div>

        <form className="mt-4" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email address"
              className={`${fieldClassName} min-w-0 flex-1`}
              aria-label="Email address"
              required
              disabled={isDisabled}
            />
            <button
              type="submit"
              disabled={isDisabled}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {formStatus === "loading"
                ? "..."
                : formStatus === "done"
                  ? "Done"
                  : "Subscribe"}
            </button>
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={dismissSession}
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Not now
            </button>
          </div>
        </form>

        {formStatus === "error" ? (
          <p className="mt-2 text-xs text-destructive">
            Could not subscribe right now. Try again.
          </p>
        ) : null}
      </div>
    </aside>
  );
}
