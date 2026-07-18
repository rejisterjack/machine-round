import Image from "next/image";
import { appStoreLinks } from "@/lib/design/tokens";
import { cn } from "@/lib/utils";

type AppStoreBadgesProps = {
  className?: string;
};

export function AppStoreBadges({ className }: AppStoreBadgesProps) {
  return (
    <div className={cn("flex flex-row gap-2", className)}>
      {appStoreLinks.map((store) => (
        <a
          key={store.label}
          href={store.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={store.label}
          className="flex-1 transition-opacity hover:opacity-80"
        >
          <Image
            src={store.imageUrl}
            alt={store.label}
            width={116}
            height={40}
            className="h-10 w-auto max-w-full object-contain"
            unoptimized
          />
        </a>
      ))}
    </div>
  );
}
