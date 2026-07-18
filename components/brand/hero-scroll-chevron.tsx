"use client";

import { ChevronsDown } from "lucide-react";
import { cn } from "@/lib/utils";

type HeroScrollChevronProps = {
  targetId: string;
  className?: string;
};

export function HeroScrollChevron({ targetId, className }: HeroScrollChevronProps) {
  function handleClick() {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Scroll to next section"
      className={cn(
        "nd-hero-scroll-chevron mx-auto flex size-10 items-center justify-center text-muted-foreground transition-colors hover:text-primary",
        className,
      )}
    >
      <ChevronsDown className="size-6" />
    </button>
  );
}
