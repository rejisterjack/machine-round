"use client";

import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

type FooterScrollToTopProps = {
  className?: string;
};

export function FooterScrollToTop({ className }: FooterScrollToTopProps) {
  return (
    <div className={cn("shrink-0", className)}>
      <button
        type="button"
        aria-label="Scroll to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="group flex flex-col items-center gap-2 transition-transform hover:scale-110"
      >
        <div className="rounded-full border-2 border-primary bg-primary/10 p-3 text-primary transition-all hover:bg-primary hover:text-primary-foreground">
          <ArrowUp className="size-6" strokeWidth={2} />
        </div>
      </button>
    </div>
  );
}
