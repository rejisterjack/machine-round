"use client";

import Image from "next/image";
import { Code2, Mail, Rocket, Sparkles, Trophy, Zap } from "lucide-react";
import { useState } from "react";

const resources = [
  "React Interview Questions",
  "Javascript Interview Questions",
  "Node.js Interview Questions",
  "Frontend System Design Interview Questions",
  "DSA Interview Questions",
] as const;

export function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [resource, setResource] = useState<string>(resources[0]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          resourcePreference: resource,
        }),
      });
      if (!response.ok) throw new Error("Newsletter signup failed.");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="w-full py-8 md:py-12 lg:py-16">
      <div className="mx-auto flex max-w-5xl flex-col items-stretch overflow-hidden rounded-2xl bg-card shadow-xl lg:flex-row">
        <div className="relative hidden min-h-96 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-purple-500/20 lg:flex lg:w-2/5">
          <div className="relative aspect-square w-full max-w-md">
            <Image
              src="/brand/newsletter-dialog.png"
              alt="Newsletter resources"
              fill
              className="rounded-lg object-cover"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-purple-600/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>
          <div className="absolute left-8 top-1/4 animate-pulse [animation-delay:300ms]">
            <div className="rounded-full border border-white/30 bg-white/20 p-2 shadow-lg backdrop-blur-md">
              <Sparkles className="size-4 text-yellow-300" />
            </div>
          </div>
          <div className="absolute right-8 top-8 animate-pulse">
            <div className="rounded-full border border-white/30 bg-white/20 p-2 shadow-lg backdrop-blur-md">
              <Code2 className="size-6 text-yellow-400" />
            </div>
          </div>
          <div className="absolute bottom-1/4 left-8 animate-pulse [animation-delay:300ms]">
            <div className="rounded-full border border-white/30 bg-white/20 p-2 shadow-lg backdrop-blur-md">
              <Zap className="size-4 text-orange-400" />
            </div>
          </div>
          <div className="absolute left-1/2 top-6 -translate-x-1/2 animate-pulse [animation-delay:500ms]">
            <div className="rounded-full border border-white/30 bg-white/20 p-2 shadow-lg backdrop-blur-md">
              <Trophy className="size-3.5 text-amber-400" />
            </div>
          </div>
          <div className="absolute bottom-6 right-8 animate-pulse [animation-delay:300ms]">
            <div className="rounded-full border border-white/30 bg-white/20 p-1.5 shadow-lg backdrop-blur-md">
              <Rocket className="size-6 p-0.5 text-red-400" />
            </div>
          </div>
        </div>

        <div className="w-full flex-1 space-y-4 p-6 md:space-y-5 md:p-8">
          <div className="flex justify-center lg:justify-start">
            <Image
              src="/brand/logo.webp"
              alt="NamasteDev"
              width={192}
              height={42}
              className="h-auto w-40 object-contain md:w-48"
            />
          </div>
          <div className="space-y-2.5">
            <p className="text-sm font-semibold text-foreground md:text-base">
              Get access to Premium resources for absolutely FREE, directly in
              your inbox!
            </p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {resources.map((item) => (
                <label
                  key={item}
                  className="group flex cursor-pointer items-start gap-2 rounded-lg border-2 border-border bg-card p-2.5 transition-all duration-200 hover:border-primary/50"
                >
                  <input
                    type="radio"
                    name="resource"
                    value={item}
                    checked={resource === item}
                    onChange={() => setResource(item)}
                    className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
                  />
                  <span className="text-sm text-foreground transition-colors group-hover:text-primary">
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div className="group relative">
              <Mail className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email address"
                className="w-full rounded-xl border-2 border-border bg-background py-3 pl-12 pr-4 text-base text-foreground shadow-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:shadow-md"
                aria-label="Email address"
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="relative w-full overflow-hidden rounded-xl bg-primary py-3 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:opacity-60"
            >
              {status === "loading" ? "Submitting..." : "Get Resource for FREE"}
            </button>
            {status === "done" ? (
              <p className="text-sm text-primary">You are on the list.</p>
            ) : null}
            {status === "error" ? (
              <p className="text-sm text-destructive">
                Could not subscribe right now. Try again.
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}
