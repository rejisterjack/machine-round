type ProductEyebrowProps = {
  label?: string;
  showFire?: boolean;
};

export function ProductEyebrow({
  label = "Learn To code. Launch Your Career.",
  showFire = true,
}: ProductEyebrowProps) {
  return (
    <div className="nd-hero-eyebrow">
      {showFire ? <span aria-hidden>🔥</span> : null}
      <span>{label}</span>
    </div>
  );
}
