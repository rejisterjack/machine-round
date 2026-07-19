"use client";

import Link from "next/link";
import {
  BookOpen,
  Bot,
  Briefcase,
  CircleDollarSign,
  Gift,
  Grid2x2,
  History,
  Lightbulb,
  Map,
  Menu,
  Monitor,
  Newspaper,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { UserMenu } from "@/components/auth/user-menu";
import { NamasteLogo } from "@/components/brand/namaste-logo";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { sidebarNavItems } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

const iconMap = {
  newspaper: Newspaper,
  briefcase: Briefcase,
  book: BookOpen,
  map: Map,
  grid: Grid2x2,
  bot: Bot,
  lightbulb: Lightbulb,
  gift: Gift,
  dollar: CircleDollarSign,
  monitor: Monitor,
  history: History,
} as const;

type MobileNavProps = {
  trigger?: React.ReactElement;
};

function SidebarLink({
  href,
  label,
  icon,
  external = true,
}: {
  href: string;
  label: string;
  icon: keyof typeof iconMap;
  external?: boolean;
}) {
  const Icon = iconMap[icon];
  const className = "nd-sidebar-item";

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        <Icon className="nd-sidebar-item-icon" strokeWidth={1.75} />
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      <Icon className="nd-sidebar-item-icon" strokeWidth={1.75} />
      {label}
    </Link>
  );
}

export function MobileNav({ trigger }: MobileNavProps) {
  const { data: session } = useSession();

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
      <SheetContent
        side="left"
        showCloseButton={false}
        className="nd-sidebar"
        overlayClassName="bg-black/55 backdrop-blur-[1px]"
      >
        <div className="nd-sidebar-header">
          <NamasteLogo
            href="https://namastedev.com/"
            size="sm"
            className="ml-0"
          />
          <SheetClose
            render={
              <button
                type="button"
                className="nd-sidebar-close"
                aria-label="Close menu"
              />
            }
          >
            <X className="size-5" strokeWidth={1.75} />
          </SheetClose>
        </div>

        <nav aria-label="NamasteDev" className="nd-sidebar-nav">
          {sidebarNavItems.map((item) => (
            <SidebarLink
              key={item.label}
              href={item.href}
              label={item.label}
              icon={item.icon}
            />
          ))}

          <div className="my-2 border-t border-white/5" />

          <SidebarLink
            href="/interview"
            label="Interview Practice"
            icon="monitor"
            external={false}
          />
          {session?.user ? (
            <SidebarLink
              href="/history"
              label="My Rounds"
              icon="history"
              external={false}
            />
          ) : null}
        </nav>

        <div className="nd-sidebar-footer">
          <UserMenu variant="mobile" className="mb-3 px-0" />
          <Link
            href="/interview"
            className={cn(
              buttonVariants({ variant: "ndPrimary", size: "lg" }),
              "w-full",
            )}
          >
            <span className="nd-cta-dot" aria-hidden />
            Start Round
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
