import { NamasteLogo } from "@/components/brand/namaste-logo";
import { SiteHeaderAuth } from "@/components/layout/site-header-auth";
import { MobileNav } from "@/components/layout/mobile-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-[60] w-full border-b border-nd-header-border bg-black">
      <div className="nd-header-bar">
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <MobileNav />
          <NamasteLogo href="/" className="-ml-1" />
        </div>

        <SiteHeaderAuth />
      </div>
    </header>
  );
}
