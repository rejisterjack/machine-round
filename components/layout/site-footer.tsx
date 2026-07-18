"use client";

import Image from "next/image";
import { AtSign, Earth, Heart, Map } from "lucide-react";
import { AppStoreBadges } from "@/components/brand/app-store-badges";
import { SocialLinks } from "@/components/brand/social-links";
import { FooterNewsletter } from "@/components/layout/footer-newsletter";
import { FooterScrollToTop } from "@/components/layout/footer-scroll-to-top";
import { footerNav } from "@/lib/design/tokens";

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
      <Icon className="size-6 text-primary" strokeWidth={2} />
      <div className="font-semibold text-foreground">{title}</div>
      <div className="flex flex-col gap-2">{children}</div>
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
      width="24"
      height="24"
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
    <footer className="w-full bg-nd-footer">
      <div className="nd-container">
        <FooterNewsletter />

        <div className="nd-section-gap nd-surface-panel">
          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex w-full flex-col gap-4 lg:max-w-xs">
              <Image
                src="/brand/logo.webp"
                alt="NamasteDev"
                width={208}
                height={45}
                className="h-auto w-44 object-contain sm:w-52"
                unoptimized
              />
              <p className="text-sm text-foreground">
                Ready to Transform Your Career?
              </p>
              <p className="text-xs text-nd-muted-text">
                Explore our course bundles designed to take you from beginner to
                job-ready, with skills that top companies demand.
              </p>
              <div className="relative w-full rounded-full bg-nd-cta-track p-1">
                <a
                  href="https://namastedev.com/learn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative inline-block w-full rounded-full border-2 border-transparent bg-primary px-4 py-3 text-center text-xs font-semibold text-primary-foreground transition hover:bg-primary/80 sm:px-6"
                >
                  EXPLORE COURSE BUNDLES
                </a>
              </div>
              <AppStoreBadges />
            </div>

            <div className="grid w-full grid-cols-1 gap-8 sm:grid-cols-2 lg:contents lg:w-auto">
              <FooterColumn icon={Map} title="Navigation">
                {footerNav.navigation.map((link) => (
                  <FooterLink key={link.label} href={link.href}>
                    {link.label}
                  </FooterLink>
                ))}
              </FooterColumn>

              <FooterColumn icon={Earth} title="Explore Our Courses">
                {footerNav.courses.map((link) => (
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

              <div className="flex flex-col gap-4">
                <Heart className="size-6 text-primary" strokeWidth={2} />
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <p>Made with</p>
                  <MadeInIndiaHeart />
                  <p>in India</p>
                </div>
                <div className="font-semibold text-foreground">Follow Us</div>
                <SocialLinks />
              </div>
            </div>

            <FooterScrollToTop className="self-end lg:self-auto" />
          </div>

          <div className="z-10 mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 md:flex-row">
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 md:justify-start">
              {footerNav.legal.map((link) => (
                <FooterLink key={link.label} href={link.href} variant="legal">
                  {link.label}
                </FooterLink>
              ))}
            </div>
            <p className="text-sm text-foreground">© 2026 NamasteDev.com</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
