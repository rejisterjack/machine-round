export function HeroGridBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(80%_50%_at_50%_0%,rgba(160,210,255,0.25),transparent)] opacity-60" />
      <div className="relative flex min-h-[var(--nd-hero-min-height)] w-full items-center justify-center overflow-hidden rounded-lg bg-background p-8 sm:p-12 lg:p-20">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-x-0 inset-y-[-30%] h-[200%] w-full skew-y-12 fill-gray-400/30 stroke-gray-400/30 [mask-image:radial-gradient(min(500px,80vw)_circle_at_center,white,transparent)]"
        >
          <defs>
            <pattern
              id="nd-hero-grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
              x="-1"
              y="-1"
            >
              <path d="M.5 40V.5H40" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#nd-hero-grid)" />
        </svg>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent sm:h-52" />
      </div>
    </div>
  );
}
