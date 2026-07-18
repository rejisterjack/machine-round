"use client";

import { ChevronDown, LayoutGrid } from "lucide-react";
import { useState } from "react";
import { exploreCourses } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

export function ExploreDropdown() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="nd-nav-link flex items-center gap-1"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <LayoutGrid className="size-[1.125rem]" strokeWidth={2} />
        Explore
        <ChevronDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
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
          <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border border-border bg-card p-2 shadow-xl sm:w-60">
            {exploreCourses.map((course) => (
              <a
                key={course.label}
                href={course.href}
                target={course.href.startsWith("http") ? "_blank" : undefined}
                rel={
                  course.href.startsWith("http")
                    ? "noopener noreferrer"
                    : undefined
                }
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-primary"
                onClick={() => setOpen(false)}
              >
                {course.label}
              </a>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
