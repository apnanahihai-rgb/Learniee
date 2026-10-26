/**
 * Lowest-rated screen settings (Oct 27, 2026). Client-safe: no server
 * imports, so both the page and the server service can read it.
 */

/** The share of rated courses / teachers (from the bottom) that get flagged. */
export const BOTTOM_PERCENT = 2;

/**
 * A course or teacher needs at least this many reviews to be ranked.
 * Without it, one unhappy parent could put a course in the bottom 2%.
 * Unranked items still show in the "All" view and can still be deleted.
 */
export const MIN_REVIEWS_TO_RANK = 3;

/** Reason length for a delete (kept in the Activity Log). */
export const DELETE_REASON_MIN = 5;
export const DELETE_REASON_MAX = 500;
