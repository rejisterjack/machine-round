type ProductEyebrowProps = {
  label?: string;
  showFire?: boolean;
};

export function ProductEyebrow({
  label = "Practice. Adapt. Improve.",
  showFire = true,
}: ProductEyebrowProps) {
  return (
    <div className="relative inline-block rounded-full">
      <div className="relative z-10 flex items-center justify-center rounded-full border border-transparent bg-gradient-to-b from-primary/10 to-primary/5 px-3 py-1">
        <span className="mx-auto flex max-w-md items-center gap-2 text-xs font-medium text-primary">
          {showFire ? <span aria-hidden>🔥</span> : null}
          {label}
        </span>
      </div>
    </div>
  );
}
