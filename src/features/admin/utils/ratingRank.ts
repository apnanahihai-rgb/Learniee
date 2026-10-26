import { BOTTOM_PERCENT, MIN_REVIEWS_TO_RANK } from "@/features/admin/config/ratingBoard";

export interface RatingInput {
  id: string;
  averageRating: number | null;
  totalReviews: number;
}

export interface RatingRank {
  /** 1 = lowest rated. Null when the item has too few reviews to rank. */
  rank: number | null;
  /** True when the item is inside the bottom BOTTOM_PERCENT. */
  flagged: boolean;
}

/**
 * Pure ranking: lowest average first. On a tie the one with MORE reviews
 * ranks lower (a firmer result), then by id so the order never flips.
 * The bottom group is BOTTOM_PERCENT of the ranked items, rounded up,
 * and never smaller than 1 when anything is ranked.
 */
export function rankByRating(items: RatingInput[]): Map<string, RatingRank> {
  const result = new Map<string, RatingRank>();

  const ranked = items
    .filter((i) => i.averageRating !== null && i.totalReviews >= MIN_REVIEWS_TO_RANK)
    .sort(
      (a, b) =>
        (a.averageRating as number) - (b.averageRating as number) ||
        b.totalReviews - a.totalReviews ||
        a.id.localeCompare(b.id),
    );

  const bottomCount = ranked.length === 0 ? 0 : Math.max(1, Math.ceil((ranked.length * BOTTOM_PERCENT) / 100));

  ranked.forEach((item, index) => {
    result.set(item.id, { rank: index + 1, flagged: index < bottomCount });
  });

  for (const item of items) {
    if (!result.has(item.id)) result.set(item.id, { rank: null, flagged: false });
  }

  return result;
}
