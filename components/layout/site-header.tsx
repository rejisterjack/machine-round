import { Menu, MoreVertical } from "lucide-react";
import { NamasteLogo } from "@/components/brand/namaste-logo";
import { ExploreDropdown } from "@/components/layout/explore-dropdown";
import { MobileNav } from "@/components/layout/mobile-nav";

export function SiteHeader() {
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
              <a
                href="https://namastedev.com"
                target="_blank"
                rel="noopener noreferrer"
                className="nd-nav-link"
              >
                Sign In
              </a>
            </li>
            <li>
              <button
                type="button"
                className="nd-nav-link"
                aria-label="More options"
              >
                <MoreVertical className="size-7" strokeWidth={2} />
              </button>
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
