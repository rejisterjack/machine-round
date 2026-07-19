export function HeroGridBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_18%_42%,rgba(229,140,51,0.22),transparent_68%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_72%_18%,rgba(237,174,47,0.08),transparent_70%)]" />
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-x-0 inset-y-[-28%] h-[165%] w-full skew-y-[10deg] fill-[rgba(229,140,51,0.14)] stroke-[rgba(229,140,51,0.22)] [mask-image:radial-gradient(ellipse_85%_70%_at_35%_45%,white,transparent)]"
      >
        <defs>
          <pattern
            id="nd-hero-grid"
            width="42"
            height="42"
            patternUnits="userSpaceOnUse"
            x="-1"
            y="-1"
          >
            <path d="M.5 42V.5H42" fill="none" strokeWidth="0.75" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#nd-hero-grid)" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/80 to-transparent sm:h-36" />
    </div>
  );
}
