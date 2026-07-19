import Link from "next/link";
import { CircleCheck, ExternalLink, Video } from "lucide-react";
import { DemoVideoHeroPreview } from "@/components/brand/demo-video-hero-preview";
import { HeroGridBackground } from "@/components/brand/hero-grid-background";
import { PageShell } from "@/components/layout/page-shell";
import { buttonVariants } from "@/components/ui/button";
import {
  cloudinaryVideoPosterUrl,
  optimizedVideoUrl,
} from "@/lib/media/cloudinary-url";
import { cn } from "@/lib/utils";

const DEMO_VIDEO_BASE =
  "https://res.cloudinary.com/dyrbtaqg2/video/upload/machine-round/marketing/namaste-machine-round-demo.mp4";

const DEMO_VIDEO_SRC = optimizedVideoUrl(DEMO_VIDEO_BASE);
const DEMO_VIDEO_POSTER = cloudinaryVideoPosterUrl(DEMO_VIDEO_BASE, {
  offsetSeconds: 20,
});

const GITHUB_REPO_URL = "https://github.com/rejisterjack/machine-round";

const demoHeroChecklist = [
  "Pick a course track and your panelist",
  "Run a live voice machine round",
  "Get a shareable readiness report",
] as const;

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
          <div className="max-w-xl lg:max-w-none">
            <span className="nd-hero-eyebrow">Demo Video</span>
            <h1 className="nd-hero-title mt-6">
              See Namaste Machine Round{" "}
              <span className="nd-hero-accent">in action</span>
            </h1>
            <p className="mt-4 text-sm text-muted-foreground sm:text-base">
              A full walkthrough — from role selection and live voice interview
              to readiness report, share link, and replay.
            </p>
            <ul className="mt-8 space-y-3">
              {demoHeroChecklist.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CircleCheck
                    className="size-6 shrink-0 fill-primary text-black"
                    strokeWidth={2}
                  />
                  <p className="text-sm text-foreground lg:text-base">{item}</p>
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="#demo-player"
                className={cn(buttonVariants({ variant: "ndHeroCta", size: "lg" }))}
              >
                <span className="nd-cta-dot" aria-hidden />
                Watch walkthrough
              </Link>
              <Link
                href="/interview"
                className={cn(buttonVariants({ variant: "ndGhost" }), "px-6 py-3")}
              >
                Try it yourself
              </Link>
            </div>
          </div>

          <div className="relative mx-auto mt-2 w-full max-w-md lg:mt-0 xl:max-w-lg">
            <DemoVideoHeroPreview posterSrc={DEMO_VIDEO_POSTER} />
          </div>
        </div>
      </section>

      <PageShell glow>
        <div className="mx-auto max-w-5xl">
          <div id="demo-player" className="nd-replay-media-card scroll-mt-24">
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
              poster={DEMO_VIDEO_POSTER}
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
