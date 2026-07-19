import Link from "next/link";
import { CircleCheck, Quote } from "lucide-react";
import { HeroFeaturedCard } from "@/components/brand/hero-featured-card";
import { HeroGridBackground } from "@/components/brand/hero-grid-background";
import { HeroScrollChevron } from "@/components/brand/hero-scroll-chevron";
import { FloatingTechIcons } from "@/components/brand/floating-tech-icons";
import { ProductEyebrow } from "@/components/brand/product-eyebrow";
import { buttonVariants } from "@/components/ui/button";
import { heroContent } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

type NdHeroProps = {
  scrollTargetId?: string;
};

export function NdHero({ scrollTargetId = "choose-track" }: NdHeroProps) {
  return (
    <section className="nd-hero">
      <HeroGridBackground />

      <div className="nd-hero-inner">
        <div className="max-w-xl lg:max-w-none">
          <ProductEyebrow label={heroContent.eyebrow} />
          <p className="nd-hero-lead mt-6">{heroContent.lead}</p>
          <h1 className="nd-hero-title mt-3">
            {heroContent.title}
            <span className="nd-hero-accent">{heroContent.accent}</span>
          </h1>
          <div className="mt-6 flex items-start gap-2">
            <Quote
              className="mt-0.5 size-5 shrink-0 rotate-180 fill-foreground text-foreground"
              strokeWidth={0}
            />
            <p className="nd-description">{heroContent.description}</p>
          </div>
          <ul className="mt-8 space-y-3">
            {heroContent.checklist.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <CircleCheck
                  className="size-6 shrink-0 fill-primary text-black"
                  strokeWidth={2}
                />
                <p className="text-sm text-foreground lg:text-base">{item}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <Link
              href={heroContent.ctaHref}
              target={heroContent.ctaExternal ? "_blank" : undefined}
              rel={heroContent.ctaExternal ? "noopener noreferrer" : undefined}
              className={cn(buttonVariants({ variant: "ndHeroCta", size: "lg" }))}
            >
              <span className="nd-cta-dot" aria-hidden />
              {heroContent.ctaLabel}
            </Link>
          </div>
        </div>

        <div className="nd-hero-media">
          <FloatingTechIcons />
          <HeroFeaturedCard />
        </div>
      </div>

      <HeroScrollChevron targetId={scrollTargetId} className="pb-8" />
    </section>
  );
}
