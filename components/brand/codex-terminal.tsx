import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CodexTerminalProps = {
  title: string;
  statusLine?: string;
  children: ReactNode;
  className?: string;
};

export function CodexTerminal({
  title,
  statusLine,
  children,
  className,
}: CodexTerminalProps) {
  return (
    <div className={cn("nd-terminal overflow-hidden", className)}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="ml-2 truncate text-xs text-muted-foreground">{title}</span>
      </div>
      {statusLine ? (
        <div className="border-b border-border bg-card px-4 py-2 text-xs text-primary">
          {statusLine}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </div>
  );
}
