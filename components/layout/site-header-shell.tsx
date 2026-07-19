import { NamasteLogo } from "@/components/brand/namaste-logo";
import { SiteHeaderAuth } from "@/components/layout/site-header-auth";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-[60] border-b border-nd-header-border bg-nd-header">
      <div className="nd-container hidden h-16 items-center justify-between lg:flex">
        <NamasteLogo href="/" />

        <div className="flex items-center gap-x-1">
          <a
            href="https://namastedev.com/learn"
            target="_blank"
            rel="noopener noreferrer"
            className="nd-nav-link"
          >
            Courses
          </a>
          <SiteHeaderAuth />
        </div>
      </div>

      <div className="flex h-14 items-center justify-between px-4 lg:hidden">
        <SiteHeaderAuth />
        <NamasteLogo href="/" size="sm" />
        <div className="w-6" aria-hidden />
      </div>
    </header>
  );
}
