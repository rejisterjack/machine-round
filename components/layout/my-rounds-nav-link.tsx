"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function MyRoundsNavLink() {
  const pathname = usePathname();

  return (
    <Link
      href="/history"
      className={cn(
        "nd-header-link hidden lg:inline-flex",
        pathname === "/history" && "nd-header-link-active",
      )}
      aria-current={pathname === "/history" ? "page" : undefined}
    >
      My Rounds
    </Link>
  );
}

export function MyRoundsNavLinkFallback() {
  return (
    <Link href="/history" className="nd-header-link hidden lg:inline-flex">
      My Rounds
    </Link>
  );
}
