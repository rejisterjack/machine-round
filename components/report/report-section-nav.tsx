"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "metrics", label: "Metrics" },
  { id: "improvements", label: "Actions" },
  { id: "topics", label: "Weak topics" },
  { id: "answers", label: "Answers" },
  { id: "share", label: "Share" },
] as const;

type ReportSectionNavProps = {
  hasWeakTopics: boolean;
  showShare: boolean;
};

export function ReportSectionNav({
  hasWeakTopics,
  showShare,
}: ReportSectionNavProps) {
  const [activeId, setActiveId] = useState<string>("overview");

  useEffect(() => {
    const visibleSections = sections.filter((section) => {
      if (section.id === "topics" && !hasWeakTopics) return false;
      if (section.id === "share" && !showShare) return false;
      return true;
    });

    const elements = visibleSections
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
  }, [hasWeakTopics, showShare]);

  const links = sections.filter((section) => {
    if (section.id === "topics" && !hasWeakTopics) return false;
    if (section.id === "share" && !showShare) return false;
    return true;
  });

  return (
    <nav
      aria-label="Report sections"
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
