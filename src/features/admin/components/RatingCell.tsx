import { adminTag } from "@/features/admin/components/ui/adminStyles";

/**
 * "★ 2.1 (5 reviews)" or "No reviews yet" (Lowest rated, design 17).
 * With `showStatus` (the "Show all" view) it also says whether the row is in
 * the bottom group or has too few reviews to be ranked.
 */
export default function RatingCell({
  averageRating,
  totalReviews,
  rank,
  flagged,
  showStatus = false,
}: {
  averageRating: number | null;
  totalReviews: number;
  rank: number | null;
  flagged: boolean;
  showStatus?: boolean;
}) {
  if (averageRating === null) {
    return <span className="text-pd-ink3">No reviews yet</span>;
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <span className="font-semibold">
        ★ {averageRating.toFixed(1)}{" "}
        <span className="font-normal text-pd-ink3">
          ({totalReviews} review{totalReviews === 1 ? "" : "s"})
        </span>
      </span>
      {showStatus &&
        (flagged ? (
          <span className={adminTag("red")}>Bottom group · rank {rank}</span>
        ) : rank === null ? (
          <span className={adminTag("gray")}>Too few reviews to rank</span>
        ) : (
          <span className={adminTag("gray")}>Rank {rank}</span>
        ))}
    </div>
  );
}
