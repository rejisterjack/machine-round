import { NdStarIcon } from "@/components/brand/nd-icons";

type CourseRatingBadgeProps = {
  rating?: string;
};

export function CourseRatingBadge({ rating = "4.8/5" }: CourseRatingBadgeProps) {
  return (
    <span className="nd-rating-badge">
      <NdStarIcon size={18} />
      {rating}
    </span>
  );
}
