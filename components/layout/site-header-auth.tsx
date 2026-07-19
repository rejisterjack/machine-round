"use client";

import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { UserMenu } from "@/components/auth/user-menu";
import { ExploreDropdown } from "@/components/layout/explore-dropdown";
import { coursesNav, hackathonNav } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

const moreOptions = [
  { label: "Home", href: "/" },
  { label: "Start Round", href: "/interview" },
  { label: "How it works", href: "/#how-it-works" },
] as const;

export function SiteHeaderAuth() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2 lg:gap-3">
      <a
        href={hackathonNav.href}
        target="_blank"
        rel="noopener noreferrer"
        className="nd-hackathon-pill hidden sm:inline-flex"
      >
        {hackathonNav.label}
        {hackathonNav.live ? <span className="nd-live-badge">Live</span> : null}
      </a>

      <a
        href={coursesNav.href}
        target="_blank"
        rel="noopener noreferrer"
        className="nd-header-link hidden md:inline-flex"
      >
        {coursesNav.label}
      </a>

      <div className="hidden md:block">
        <ExploreDropdown />
      </div>

      {session?.user ? (
        <Link href="/history" className="nd-header-link hidden lg:inline-flex">
          My Rounds
        </Link>
      ) : null}

      <UserMenu />

      <div className="relative hidden lg:block">
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-white/5"
          aria-label="More options"
          aria-expanded={moreOpen}
          aria-haspopup="true"
          onClick={() => setMoreOpen((value) => !value)}
        >
          <MoreVertical className="size-6" strokeWidth={2} />
        </button>
        {moreOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40"
              aria-label="Close more options menu"
              onClick={() => setMoreOpen(false)}
            />
            <div className="nd-header-more-panel">
              {moreOptions.map((option) => (
                <a
                  key={option.label}
                  href={option.href}
                  className={cn("nd-header-more-item")}
                  onClick={() => setMoreOpen(false)}
                >
                  {option.label}
                </a>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </nav>
  );
}
