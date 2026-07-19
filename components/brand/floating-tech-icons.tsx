import Image from "next/image";

const STACK_ICONS = [
  { src: "/brand/tech/html5.svg", alt: "HTML5", shift: "0" },
  { src: "/brand/tech/css3.svg", alt: "CSS3", shift: "1.75rem" },
  { src: "/brand/tech/nodejs.svg", alt: "Node.js", shift: "0.5rem" },
  { src: "/brand/tech/react.svg", alt: "React", shift: "2rem" },
  { src: "/brand/tech/express.svg", alt: "Express", shift: "0.75rem" },
] as const;

export function FloatingTechIcons() {
  return (
    <div
      className="pointer-events-none absolute -left-2 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 lg:flex xl:-left-6"
      aria-hidden
    >
      {STACK_ICONS.map((icon, index) => (
        <div
          key={icon.src}
          className="nd-hero-float-icon"
          style={{
            marginLeft: icon.shift,
            animationDelay: `${index * 0.35}s`,
          }}
        >
          <Image
            src={icon.src}
            alt=""
            width={44}
            height={44}
            className="size-10 object-contain lg:size-11"
          />
        </div>
      ))}
    </div>
  );
}
