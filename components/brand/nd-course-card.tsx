import Image from "next/image";
import { NdGlobeIcon } from "@/components/brand/nd-icons";
import { CourseRatingBadge } from "@/components/brand/course-rating-badge";
import { cn } from "@/lib/utils";

type NdCourseCardProps = {
  title: string;
  description: string;
  imageUrl: string;
  rating?: number;
  language?: string;
  selected?: boolean;
  onSelect?: () => void;
  href?: string;
  showViewDetails?: boolean;
  className?: string;
};

export function NdCourseCard({
  title,
  description,
  imageUrl,
  rating = 4.9,
  language = "English",
  selected = false,
  onSelect,
  href,
  showViewDetails = true,
  className,
}: NdCourseCardProps) {
  const content = (
    <>
      <div className="p-2">
        <div className="relative aspect-[680/383] w-full overflow-hidden rounded-xl">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
            unoptimized
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-left text-sm font-bold">{title}</h3>
          <CourseRatingBadge rating={`${rating}/5`} />
        </div>
        <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <NdGlobeIcon size={16} />
            {language}
          </span>
          {showViewDetails ? (
            onSelect ? (
              <span
                className={cn(
                  "inline-flex items-center rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground sm:px-6",
                  selected && "ring-2 ring-primary/50",
                )}
              >
                {selected ? "Selected" : "View Details"}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground sm:px-6">
                View Details
              </span>
            )
          ) : null}
        </div>
      </div>
    </>
  );

  const cardClassName = cn(
    "group nd-course-card flex h-full w-full flex-col overflow-hidden text-left transition-all",
    selected && "border-primary shadow-[0_0_30px_rgba(229,140,51,0.15)]",
    className,
  );

  if (href && !onSelect) {
    return (
      <a href={href} className={cardClassName}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onSelect} className={cardClassName}>
      {content}
    </button>
  );
}
