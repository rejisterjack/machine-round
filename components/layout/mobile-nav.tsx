"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useSession } from "next-auth/react";
import { UserMenu } from "@/components/auth/user-menu";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { exploreCourses } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Courses", href: "https://namastedev.com/learn" },
  { label: "Contact", href: "https://namastedev.com/contact-us" },
] as const;

type MobileNavProps = {
  trigger?: React.ReactElement;
};

export function MobileNav({ trigger }: MobileNavProps) {
  const { data: session } = useSession();
  const defaultTrigger = (
    <button
      type="button"
      className="inline-flex size-8 items-center justify-center rounded-lg text-foreground hover:bg-white/5"
      aria-label="Open menu"
    >
      <Menu className="size-5" />
    </button>
  );

  return (
    <Sheet>
      <SheetTrigger render={trigger ?? defaultTrigger} />
      <SheetContent side="left" className="w-full max-w-xs border-border bg-nd-header">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          <p className="mb-2 mt-2 nd-section-heading">Explore</p>
          {exploreCourses.map((course) => (
            <a
              key={course.label}
              href={course.href}
              target={course.href.startsWith("http") ? "_blank" : undefined}
              rel={
                course.href.startsWith("http") ? "noopener noreferrer" : undefined
              }
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-primary"
            >
              {course.label}
            </a>
          ))}
          <p className="mb-2 mt-4 nd-section-heading">Account</p>
          <UserMenu variant="mobile" className="px-1" />
          {session?.user ? (
            <Link
              href="/history"
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-primary"
            >
              My Rounds
            </Link>
          ) : null}
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-primary"
            >
              {link.label}
            </a>
          ))}
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
