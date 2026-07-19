"use client";

import Link from "next/link";
import {
  ChevronUp,
  ClipboardList,
  Code2,
  Menu,
  Monitor,
  Trophy,
  Users,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { UserMenu } from "@/components/auth/user-menu";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  coursesNav,
  exploreNavItems,
  hackathonNav,
} from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

const iconMap = {
  monitor: Monitor,
  users: Users,
  trophy: Trophy,
  clipboard: ClipboardList,
  code: Code2,
} as const;

type MobileNavProps = {
  trigger?: React.ReactElement;
};

export function MobileNav({ trigger }: MobileNavProps) {
  const { data: session } = useSession();
  const [exploreOpen, setExploreOpen] = useState(false);

  const defaultTrigger = (
    <button
      type="button"
      className="inline-flex size-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-white/5"
      aria-label="Open menu"
    >
      <Menu className="size-6" strokeWidth={2} />
    </button>
  );

  return (
    <Sheet>
      <SheetTrigger render={trigger ?? defaultTrigger} />
      <SheetContent side="left" className="w-full max-w-xs border-border bg-black">
        <SheetHeader>
          <SheetTitle className="text-foreground">Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          <a
            href={hackathonNav.href}
            target="_blank"
            rel="noopener noreferrer"
            className="nd-hackathon-pill mt-2 w-fit"
          >
            {hackathonNav.label}
            {hackathonNav.live ? <span className="nd-live-badge">Live</span> : null}
          </a>

          <a
            href={coursesNav.href}
            target="_blank"
            rel="noopener noreferrer"
            className="nd-header-link mt-3 inline-flex"
          >
            {coursesNav.label}
          </a>

          <button
            type="button"
            className={cn(
              "nd-header-pill mt-3 w-fit",
              exploreOpen && "nd-header-pill-open",
            )}
            aria-expanded={exploreOpen}
            onClick={() => setExploreOpen((value) => !value)}
          >
            Explore
            <ChevronUp
              className={cn(
                "size-4 transition-transform duration-200",
                !exploreOpen && "rotate-180",
              )}
            />
          </button>

          {exploreOpen ? (
            <div className="mt-2 space-y-1 rounded-xl border border-white/10 bg-[#080808] p-2">
              {exploreNavItems.map((item) => {
                const Icon = iconMap[item.icon];
                const isExternal = item.href.startsWith("http");
                const className = "nd-explore-item";

                if (isExternal) {
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={className}
                    >
                      <Icon className="nd-explore-item-icon" strokeWidth={1.75} />
                      {item.label}
                    </a>
                  );
                }

                return (
                  <Link key={item.label} href={item.href} className={className}>
                    <Icon className="nd-explore-item-icon" strokeWidth={1.75} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ) : null}

          <div className="mt-4 border-t border-white/10 pt-4">
            <UserMenu variant="mobile" className="px-1" />
          </div>

          {session?.user ? (
            <Link
              href="/history"
              className="nd-header-link mt-2 inline-flex px-3"
            >
              My Rounds
            </Link>
          ) : null}

          <Link
            href="/interview"
            className={cn(buttonVariants({ variant: "ndPrimary", size: "lg" }), "mt-6 w-full")}
          >
            <span className="nd-cta-dot" aria-hidden />
            Start Round
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
