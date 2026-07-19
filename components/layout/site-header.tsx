"use client";

import { Menu, MoreVertical } from "lucide-react";
import { useState } from "react";
import { NamasteLogo } from "@/components/brand/namaste-logo";
import { UserMenu } from "@/components/auth/user-menu";
import { ExploreDropdown } from "@/components/layout/explore-dropdown";
import { MobileNav } from "@/components/layout/mobile-nav";
import { cn } from "@/lib/utils";

const moreOptions = [
  { label: "Home", href: "/" },
  { label: "Start Round", href: "/interview" },
  { label: "How it works", href: "/#how-it-works" },
] as const;

export function SiteHeader() {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <header className="sticky top-0 z-[60] border-b border-nd-header-border bg-nd-header">
      <div className="nd-container hidden h-16 items-center justify-between lg:flex">
        <NamasteLogo href="/" />

        <nav aria-label="Main">
          <ul className="flex items-center gap-x-1">
            <li>
              <a
                href="https://namastedev.com/learn"
                target="_blank"
                rel="noopener noreferrer"
                className="nd-nav-link"
              >
                Courses
              </a>
            </li>
            <li>
              <ExploreDropdown />
            </li>
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
      </div>

      <div className="flex h-14 items-center justify-between px-4 lg:hidden">
        <MobileNav
          trigger={
            <button type="button" className="text-foreground" aria-label="Open menu">
              <Menu className="size-6" strokeWidth={2} />
            </button>
          }
        />
        <NamasteLogo href="/" size="sm" />
        <div className="w-6" aria-hidden />
      </div>
    </header>
  );
}
