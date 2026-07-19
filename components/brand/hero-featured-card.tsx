import Image from "next/image";
import { heroContent } from "@/lib/design/tokens";

export function HeroFeaturedCard() {
  return (
    <Image
      src={heroContent.imageSrc}
      alt={heroContent.imageAlt}
      width={448}
      height={432}
      className="nd-hero-image"
      priority
      unoptimized
    />
  );
}
