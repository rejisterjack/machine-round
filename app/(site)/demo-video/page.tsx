import Link from "next/link";
import { ExternalLink, Video } from "lucide-react";
import { HeroGridBackground } from "@/components/brand/hero-grid-background";
import { PageShell } from "@/components/layout/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { optimizedVideoUrl } from "@/lib/media/cloudinary-url";
import { cn } from "@/lib/utils";

const DEMO_VIDEO_SRC = optimizedVideoUrl(
  "https://res.cloudinary.com/dyrbtaqg2/video/upload/machine-round/marketing/namaste-machine-round-demo.mp4",
);

const GITHUB_REPO_URL = "https://github.com/rejisterjack/machine-round";

const highlights = [
  {
    number: "01",
    title: "The hook",
    description:
      "A real AI hiring screen with no human in the room — scoring clarity, structure, and depth.",
  },
  {
    number: "02",
    title: "The problem",
    description:
      "Most prep tools train you for a human interviewer. AI evaluators listen for different signals.",
  },
  {
    number: "03",
    title: "Live product",
    description:
      "Pick a role, join the voice room, and answer live — with adaptive follow-ups on what you just said.",
  },
  {
    number: "04",
    title: "Readiness report",
    description:
      "A separate evaluator agent scores the transcript with per-answer breakdown, red flags, and actions.",
  },
  {
    number: "05",
    title: "Share & replay",
    description:
      "Share the report, download PDF, or send judges a replay link — all from one session.",
  },
] as const;

export const metadata = {
  title: "Demo Video · Namaste Machine Round",
  description:
    "A full product walkthrough of Namaste Machine Round — voice interview, adaptive follow-ups, readiness report, and share.",
};

export default function DemoVideoPage() {
  return (
    <>
      <section className="nd-hero">
        <HeroGridBackground />

        <div className="nd-hero-inner">
          <div className="mx-auto max-w-3xl text-center">
            <span className="nd-hero-eyebrow">Demo Video</span>
            <h1 className="nd-hero-title mt-6">
              See Namaste Machine Round{" "}
              <span className="nd-hero-accent">in action</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm text-muted-foreground sm:text-base">
              A full walkthrough — from role selection and live voice interview
              to readiness report, share link, and replay.
            </p>
          </div>
        </div>
      </section>

      <PageShell glow>
        <div className="mx-auto max-w-5xl">
          <div className="nd-replay-media-card">
            <div className="nd-replay-media-header">
              <div className="flex items-center gap-2">
                <Video className="size-4 text-primary" />
                <span className="text-sm font-medium">Product demo</span>
              </div>
              <span className="nd-pill-badge text-xs">Product walkthrough</span>
            </div>
            <video
              src={DEMO_VIDEO_SRC}
              controls
              playsInline
              preload="metadata"
              poster="/brand/hero-interview.jpeg"
              className="aspect-video w-full bg-black"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <p>Product walkthrough of Namaste Machine Round</p>
            <a
              href={DEMO_VIDEO_SRC}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
            >
              Open in new tab
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>

          <section className="nd-section-gap">
            <p className="nd-section-heading text-center">What you&apos;ll see</p>
            <h2 className="mt-3 text-center font-heading text-2xl font-medium sm:text-3xl lg:text-4xl">
              From first question to{" "}
              <span className="nd-gradient-text">readiness report</span>
            </h2>
            <div className="nd-card-grid mt-10">
              {highlights.map((item) => (
                <div key={item.number} className="nd-course-card p-6">
                  <p className="nd-section-label mb-3">{item.number}</p>
                  <h3 className="font-heading text-xl font-medium">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="nd-section-gap text-center">
            <p className="nd-section-heading">Ready to try it?</p>
            <h2 className="mt-3 font-heading text-2xl font-medium sm:text-3xl">
              Run your own machine round
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Practice with voice interviews, adaptive follow-ups, and a
              shareable readiness report — built for how AI screens actually work.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/interview"
                className={cn(buttonVariants({ variant: "ndHeroCta" }))}
              >
                <span className="nd-cta-dot" aria-hidden />
                Try the interview
              </Link>
              <Link
                href="/pitch-deck.html"
                className={cn(buttonVariants({ variant: "ndGhost" }), "px-6 py-3")}
              >
                View pitch deck
              </Link>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "ndGhost" }), "px-6 py-3")}
              >
                Read the docs
              </a>
            </div>
          </section>
        </div>
      </PageShell>
    </>
  );
}
