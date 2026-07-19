import Image from "next/image";
import { Clock, Mic, Play, Share2 } from "lucide-react";
import { PanelistAvatar } from "@/components/interview/panelist-avatar";

type DemoVideoHeroPreviewProps = {
  posterSrc: string;
  durationLabel?: string;
};

const previewSteps = [
  { icon: Mic, label: "Live voice interview" },
  { icon: Share2, label: "Readiness report" },
  { icon: Clock, label: "Shareable replay" },
] as const;

export function DemoVideoHeroPreview({
  posterSrc,
  durationLabel = "~7 min",
}: DemoVideoHeroPreviewProps) {
  return (
    <div className="w-full">
      <a
        href="#demo-player"
        className="group relative block overflow-hidden rounded-2xl border border-border bg-black shadow-[0_24px_60px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
      >
        <div className="relative aspect-video w-full">
          <Image
            src={posterSrc}
            alt="Namaste Machine Round product walkthrough preview"
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 1024px) 90vw, 32rem"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg transition-transform group-hover:scale-105">
              <Play className="ml-1 size-7 fill-current" aria-hidden />
            </span>
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Product walkthrough</p>
              <p className="text-xs text-white/75">{durationLabel}</p>
            </div>
            <div className="flex -space-x-2">
              <PanelistAvatar panelistId="akshay" className="size-9 ring-2 ring-black/50" />
              <PanelistAvatar panelistId="archy" className="size-9 ring-2 ring-black/50" />
            </div>
          </div>
        </div>
      </a>

      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {previewSteps.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2.5 text-xs text-muted-foreground backdrop-blur-sm"
          >
            <Icon className="size-3.5 shrink-0 text-primary" aria-hidden />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
