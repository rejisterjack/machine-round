import { cn } from "@/lib/utils";

type PageShellProps = {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
};

export function PageShell({ children, className, glow = false }: PageShellProps) {
  return (
    <div className={cn("relative nd-dot-grid", glow && "nd-glow-orange", className)}>
      <div className="nd-container relative z-10 py-10 sm:py-14 lg:py-16">
        {children}
      </div>
    </div>
  );
}
