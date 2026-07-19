"use client";

import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { UserMenu } from "@/components/auth/user-menu";
import { ExploreDropdown } from "@/components/layout/explore-dropdown";
import { MobileNav } from "@/components/layout/mobile-nav";
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
    <>
      <nav aria-label="Main" className="hidden lg:block">
        <ul className="flex items-center gap-x-1">
          <li>
            <ExploreDropdown />
          </li>
          {session?.user ? (
            <li>
              <Link href="/history" className="nd-nav-link">
                My Rounds
              </Link>
            </li>
          ) : null}
          <li>
            <UserMenu />
          </li>
          <li className="relative">
            <button
              type="button"
              className="nd-nav-link"
              aria-label="More options"
              aria-expanded={moreOpen}
              aria-haspopup="true"
              onClick={() => setMoreOpen((value) => !value)}
            >
              <MoreVertical className="size-7" strokeWidth={2} />
            </button>
            {moreOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40"
                  aria-label="Close more options menu"
                  onClick={() => setMoreOpen(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-border bg-card p-2 shadow-xl">
                  {moreOptions.map((option) => (
                    <a
                      key={option.label}
                      href={option.href}
                      className={cn(
                        "block rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary",
                      )}
                      onClick={() => setMoreOpen(false)}
                    >
                      {option.label}
                    </a>
                  ))}
                </div>
              </>
            ) : null}
          </li>
        </ul>
      </nav>

      <div className="lg:hidden">
        <MobileNav />
      </div>
    </>
  );
}
