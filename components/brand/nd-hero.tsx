import Image from "next/image";
import Link from "next/link";
import { CircleCheck, Quote } from "lucide-react";
import { HeroGridBackground } from "@/components/brand/hero-grid-background";
import { HeroScrollChevron } from "@/components/brand/hero-scroll-chevron";
import { FloatingTechIcons } from "@/components/brand/floating-tech-icons";
import { ProductEyebrow } from "@/components/brand/product-eyebrow";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NdHeroProps = {
  eyebrow?: string;
  tagline: string;
  title: string;
  accentWord: string;
  description: string;
  checklist: string[];
  ctaLabel: string;
  ctaHref: string;
  scrollTargetId?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  onSecondaryClick?: () => void;
};

export function NdHero({
  eyebrow = "Practice. Adapt. Improve.",
  tagline,
  title,
  accentWord,
  description,
  checklist,
  ctaLabel,
  ctaHref,
  scrollTargetId = "choose-track",
  secondaryLabel,
  secondaryHref,
  onSecondaryClick,
}: NdHeroProps) {
  const titleParts = title.split(accentWord);

  return (
    <section className="nd-hero">
      <HeroGridBackground />

      <div className="nd-hero-inner">
        <div className="max-w-xl lg:max-w-none">
          <ProductEyebrow label={eyebrow} />
          <p className="nd-hero-tagline mt-6">{tagline}</p>
          <h1 className="mt-6 font-heading text-2xl font-medium leading-tight text-foreground sm:text-3xl lg:text-4xl xl:text-5xl">
            {titleParts[0]}
            <span className="nd-hero-accent">{accentWord}</span>
            {titleParts[1] ?? ""}
          </h1>
          <div className="mt-6 flex items-start gap-2">
            <Quote
              className="mt-0.5 size-5 shrink-0 rotate-180 fill-foreground text-foreground"
              strokeWidth={0}
            />
            <p className="nd-description">{description}</p>
          </div>
          <ul className="mt-8 space-y-3">
            {checklist.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CircleCheck
                  className="size-6 shrink-0 fill-primary text-background"
                  strokeWidth={2}
                />
                <p className="text-sm text-foreground lg:text-base">{item}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href={ctaHref}
              className={cn(buttonVariants({ variant: "ndPrimary", size: "lg" }))}
            >
              <span className="nd-cta-dot" aria-hidden />
              {ctaLabel}
            </Link>
            {secondaryLabel && secondaryHref ? (
              <Link
                href={secondaryHref}
                className={cn(buttonVariants({ variant: "ndGhost", size: "lg" }))}
              >
                {secondaryLabel}
              </Link>
            ) : secondaryLabel && onSecondaryClick ? (
              <Button variant="ndGhost" size="lg" onClick={onSecondaryClick}>
                {secondaryLabel}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="nd-hero-media">
          <FloatingTechIcons />
          <Image
            src="/brand/hero-interview.jpeg"
            alt="Namaste Machine Round interview practice"
            width={448}
            height={432}
            className="nd-hero-image"
            priority
            unoptimized
          />
        </div>
      </div>

      <HeroScrollChevron targetId={scrollTargetId} className="pb-8" />
    </section>
  );
}
