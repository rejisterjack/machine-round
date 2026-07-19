"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const allSections = [
  { id: "overview", label: "Overview" },
  { id: "recording", label: "Recording" },
  { id: "screen", label: "Screen" },
  { id: "transcript", label: "Transcript" },
  { id: "report", label: "Report" },
] as const;

type ReplaySectionNavProps = {
  hasRecording: boolean;
  hasScreen: boolean;
  hasReport: boolean;
};

export function ReplaySectionNav({
  hasRecording,
  hasScreen,
  hasReport,
}: ReplaySectionNavProps) {
  const [activeId, setActiveId] = useState<string>("overview");

  const links = allSections.filter((section) => {
    if (section.id === "recording" && !hasRecording) return false;
    if (section.id === "screen" && !hasScreen) return false;
    if (section.id === "report" && !hasReport) return false;
    return true;
  });

  useEffect(() => {
    const elements = links
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null);

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.1, 0.35, 0.6] },
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [hasRecording, hasScreen, hasReport, links.length]);

  return (
    <nav
      aria-label="Replay sections"
      className="nd-report-section-nav hidden lg:flex lg:gap-1"
    >
      {links.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className={cn(
            "nd-report-section-link",
            activeId === section.id && "nd-report-section-link-active",
          )}
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}
