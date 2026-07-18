"use client";

import Link from "next/link";
import { CodexTerminal } from "@/components/brand/codex-terminal";
import { NdCourseCard } from "@/components/brand/nd-course-card";
import { NdHero } from "@/components/brand/nd-hero";
import { PageShell } from "@/components/layout/page-shell";
import { roles } from "@/lib/design/tokens";

const steps = [
  {
    number: "01",
    title: "Select your role",
    description: "Pick a generic engineering track to ground the interview.",
  },
  {
    number: "02",
    title: "Run a machine round",
    description: "Answer 5–7 adaptive questions by voice or text.",
  },
  {
    number: "03",
    title: "Get your readiness report",
    description: "See scores, red flags, and concrete improvement actions.",
  },
];

const benefits = [
  {
    title: "Adaptive follow-ups",
    description:
      "Every question references your actual answers — not a static script.",
  },
  {
    title: "Voice or text",
    description:
      "Practice the way real AI screens work, with voice and text input.",
  },
  {
    title: "Readiness report",
    description:
      "Get scores, red flags, and concrete actions to improve before the real screen.",
  },
];

export default function HomePage() {
  function scrollToHowItWorks() {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  }

  function scrollToTracks() {
    document.getElementById("choose-track")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <NdHero
        eyebrow="Practice. Adapt. Improve."
        tagline="Interview Preparation"
        title="Train for the Machine Round"
        accentWord="Machine Round"
        description="A realistic AI-style screening interview that adapts its follow-ups based on your actual answers and returns a structured readiness report — so you walk in knowing what the screener is listening for."
        checklist={[
          "Adaptive follow-ups that reference your actual answers",
          "Voice and text input — practice like a real AI screen",
          "Structured readiness report with concrete improvement actions",
        ]}
        ctaLabel="Start a Machine Round"
        ctaHref="/interview"
        scrollTargetId="choose-track"
        secondaryLabel="View how it works"
        onSecondaryClick={scrollToHowItWorks}
      />

      <PageShell glow>
      <section id="choose-track" className="nd-section-gap">
        <div className="mb-6 flex justify-center">
          <span className="nd-section-pill">Explore our best tracks</span>
        </div>
        <h2 className="text-center font-heading text-2xl font-medium sm:text-3xl lg:text-4xl">
          Choose Your Path To{" "}
          <span className="nd-gradient-text">Success</span>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground sm:text-base">
          Transform your prep with adaptive AI interviews, crafted to mirror
          how real engineering screens actually work.
        </p>
        <div className="nd-card-grid mt-10">
          {roles.map((role) => (
            <NdCourseCard
              key={role.id}
              title={`Namaste ${role.title}`}
              description={role.description}
              imageUrl={role.imageUrl}
              rating={role.rating}
              language={role.language}
              href="/interview"
            />
          ))}
        </div>
      </section>

      <section id="how-it-works" className="nd-section-gap">
        <p className="nd-section-heading text-center">How it works</p>
        <h2 className="mt-3 text-center font-heading text-2xl font-medium sm:text-3xl lg:text-4xl">
          Three steps to interview readiness
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="nd-course-card p-6">
              <p className="nd-section-label mb-3">{step.number}</p>
              <h3 className="font-heading text-xl font-medium">{step.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="nd-section-gap">
        <p className="nd-section-heading text-center">
          Why Namaste Machine Round
        </p>
        <h2 className="mt-3 text-center font-heading text-2xl font-medium sm:text-3xl lg:text-4xl">
          Built for how AI screens actually work
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="nd-course-card p-6">
              <h3 className="font-heading text-lg font-medium">
                {benefit.title}
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="nd-section-gap">
        <p className="nd-section-heading mb-4">Preview</p>
        <h2 className="mb-6 font-heading text-xl font-medium sm:text-2xl lg:text-3xl">
          See adaptive follow-ups in action
        </h2>
        <CodexTerminal title="Namaste Machine Round · adaptive follow-up">
          <div className="space-y-4 text-left text-sm">
            <div className="nd-message-user">
              I led a migration from a monolith to services, but we kept the
              checkout flow on the legacy path for two releases.
            </div>
            <div className="nd-message-assistant">
              You mentioned keeping checkout on the legacy path — what metric
              told you that was the right rollback boundary?
            </div>
            <p className="text-xs text-primary">Adaptive follow-up detected</p>
          </div>
        </CodexTerminal>
        <div className="mt-8 text-center">
          <Link
            href="/interview"
            className="text-sm text-primary underline-offset-4 hover:underline"
            onClick={(event) => {
              event.preventDefault();
              scrollToTracks();
            }}
          >
            Browse all tracks →
          </Link>
        </div>
      </section>
      </PageShell>
    </>
  );
}
