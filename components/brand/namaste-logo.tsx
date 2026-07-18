import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type NamasteLogoProps = {
  href?: string | null;
  className?: string;
  showProductName?: boolean;
  size?: "sm" | "md";
};

export function NamasteLogo({
  href = "/",
  className,
  showProductName = false,
  size = "md",
}: NamasteLogoProps) {
  const logo = (
    <Image
      src="/brand/logo.webp"
      alt="NamasteDev"
      width={200}
      height={44}
      className={cn(
        "ml-2 h-auto object-contain",
        size === "sm" ? "w-40 sm:w-44" : "w-44 sm:w-48 lg:w-[12.5rem]",
        className,
      )}
      priority
    />
  );

  if (showProductName) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <Link href="/" className="shrink-0">
          {logo}
        </Link>
        <Link
          href="/"
          className="hidden font-heading text-sm font-medium text-foreground hover:text-primary sm:inline sm:text-base"
        >
          Namaste Machine Round
        </Link>
      </div>
    );
  }

  if (href) {
    return (
      <Link href={href} className={cn("inline-flex shrink-0 items-center", className)}>
        {logo}
      </Link>
    );
  }

  return <div className={cn("inline-block shrink-0", className)}>{logo}</div>;
}
