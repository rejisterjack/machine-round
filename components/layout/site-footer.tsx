import Image from "next/image";
import { AtSign, Earth, Heart, Map } from "lucide-react";
import { AppStoreBadges } from "@/components/brand/app-store-badges";
import { SocialLinks } from "@/components/brand/social-links";
import { FooterScrollToTop } from "@/components/layout/footer-scroll-to-top";
import { footerCta, footerInterviewLinks, footerNav } from "@/lib/design/tokens";

function FooterColumn({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="nd-footer-column-title">
        <Icon className="size-5 shrink-0 text-primary" strokeWidth={2} />
        <span>{title}</span>
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function FooterLink({
  href,
  children,
  variant = "column",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "column" | "legal";
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") || href.startsWith("mailto") ? "_blank" : undefined}
      rel={
        href.startsWith("http") || href.startsWith("mailto")
          ? "noopener noreferrer"
          : undefined
      }
      className={variant === "legal" ? "nd-footer-legal-link" : "nd-footer-link"}
    >
      {children}
    </a>
  );
}

function MadeInIndiaHeart() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden
      className="text-nd-heart"
    >
      <path
        fill="currentColor"
        d="m12 21.35-1.45-1.32C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.53z"
      />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="w-full bg-black">
      <div className="nd-footer-bar">
        <div className="nd-footer-grid">
          <div className="flex flex-col gap-4">
            <Image
              src="/brand/logo.webp"
              alt="NamasteDev"
              width={208}
              height={45}
              className="h-auto w-44 object-contain sm:w-[13rem]"
              unoptimized
            />
            <p className="text-base font-semibold text-foreground">
              {footerCta.headline}
            </p>
            <p className="max-w-xs text-sm leading-relaxed text-nd-muted-text">
              {footerCta.description}
            </p>
            <a
              href={footerCta.href}
              target="_blank"
              rel="noopener noreferrer"
              className="nd-footer-cta"
            >
              {footerCta.buttonLabel}
            </a>
            <AppStoreBadges className="mt-1" />
          </div>

          <FooterColumn icon={Map} title="Navigation">
            {footerNav.navigation.map((link) => (
              <FooterLink key={link.label} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn icon={Earth} title="Explore Interviews">
            {footerInterviewLinks.map((link) => (
              <FooterLink key={link.label} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn icon={AtSign} title="Contact Us">
            <FooterLink href="mailto:support@namastedev.com">
              support@namastedev.com
            </FooterLink>
          </FooterColumn>

          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-col gap-4">
              <div className="nd-footer-column-title">
                <Heart className="size-5 shrink-0 text-primary" strokeWidth={2} />
                <span className="inline-flex items-center gap-1.5 font-normal text-foreground">
                  Made with
                  <MadeInIndiaHeart />
                  in India
                </span>
              </div>
              <div className="font-semibold text-foreground">Follow Us</div>
              <SocialLinks />
            </div>
            <FooterScrollToTop className="hidden sm:flex" />
          </div>
        </div>

        <div className="nd-footer-bottom">
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 md:justify-start">
            {footerNav.legal.map((link) => (
              <FooterLink key={link.label} href={link.href} variant="legal">
                {link.label}
              </FooterLink>
            ))}
          </div>
          <p className="text-sm text-nd-muted-text">© 2026 NamasteDev.com</p>
        </div>
      </div>
    </footer>
  );
}
