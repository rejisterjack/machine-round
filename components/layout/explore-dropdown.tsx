"use client";

import {
  ChevronUp,
  ClipboardList,
  Code2,
  LayoutGrid,
  Monitor,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { exploreNavItems } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

const iconMap = {
  monitor: Monitor,
  users: Users,
  trophy: Trophy,
  clipboard: ClipboardList,
  code: Code2,
} as const;

function ExploreIcon({ name }: { name: (typeof exploreNavItems)[number]["icon"] }) {
  const Icon = iconMap[name];
  return <Icon className="nd-explore-item-icon" strokeWidth={1.75} />;
}

export function ExploreDropdown() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn("nd-header-pill", open && "nd-header-pill-open")}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <LayoutGrid className="size-4" strokeWidth={2} />
        Explore
        <ChevronUp
          className={cn(
            "size-4 text-foreground/80 transition-transform duration-200",
            !open && "rotate-180",
          )}
          strokeWidth={2}
        />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Close explore menu"
            onClick={() => setOpen(false)}
          />
          <div className="nd-explore-panel">
            {exploreNavItems.map((item) => {
              const isExternal = item.href.startsWith("http");
              const className = "nd-explore-item w-full text-left";

              if (isExternal) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                    onClick={() => setOpen(false)}
                  >
                    <ExploreIcon name={item.icon} />
                    {item.label}
                  </a>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={className}
                  onClick={() => setOpen(false)}
                >
                  <ExploreIcon name={item.icon} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
