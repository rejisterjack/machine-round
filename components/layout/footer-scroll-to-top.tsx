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
        className="flex size-11 items-center justify-center rounded-full border-2 border-primary bg-transparent text-primary transition-all hover:bg-primary hover:text-black"
      >
        <ArrowUp className="size-5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
