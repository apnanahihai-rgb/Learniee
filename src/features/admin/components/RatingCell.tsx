import { AdminPill } from "@/features/admin/components/ui/primitives";

/** "3.2 ★ (12 reviews)" or "No reviews yet", plus the rank / flag pills. */
export default function RatingCell({
  averageRating,
  totalReviews,
  rank,
  flagged,
}: {
  averageRating: number | null;
  totalReviews: number;
  rank: number | null;
  flagged: boolean;
}) {
  if (averageRating === null) {
    return <span className="text-admin-muted">No reviews yet</span>;
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <span className="font-extrabold">
        {averageRating.toFixed(2)} ★{" "}
        <span className="font-semibold text-admin-muted">
          ({totalReviews} review{totalReviews === 1 ? "" : "s"})
        </span>
      </span>
      {flagged ? (
        <AdminPill tone="bad">Bottom group · rank {rank}</AdminPill>
      ) : rank === null ? (
        <AdminPill tone="neutral">Too few reviews to rank</AdminPill>
      ) : (
        <AdminPill tone="neutral">Rank {rank}</AdminPill>
      )}
    </div>
  );
}
