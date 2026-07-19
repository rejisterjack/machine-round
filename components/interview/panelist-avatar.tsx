import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPanelist, type PanelistId } from "@/lib/ai/personas/panelists";
import { cn } from "@/lib/utils";

type PanelistAvatarProps = {
  panelistId: PanelistId;
  className?: string;
  fallbackClassName?: string;
};

export function PanelistAvatar({
  panelistId,
  className,
  fallbackClassName,
}: PanelistAvatarProps) {
  const panelist = getPanelist(panelistId);

  return (
    <Avatar className={cn("shrink-0", className)}>
      {panelist.imageUrl ? (
        <AvatarImage src={panelist.imageUrl} alt={panelist.name} />
      ) : null}
      <AvatarFallback
        className={cn("text-xs font-medium text-white", fallbackClassName)}
        style={{ backgroundColor: panelist.accentColor }}
      >
        {panelist.avatarFallback}
      </AvatarFallback>
    </Avatar>
  );
}
