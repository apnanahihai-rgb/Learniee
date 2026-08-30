export const EXCLUDED_DETAIL_KEYS = ["id", "cognitoSub", "cognitoId", "parentId", "teacherId"];

export function formatDetailLabel(key: string) {
  const spaced = key.replace(/([A-Z])/g, " $1").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function formatDetailValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(value).toLocaleString();
  }
  return String(value);
}

/**
 * True for entries worth rendering as a plain "label: value" row —
 * excludes internal ID fields and anything null/undefined/nested.
 * Previously this exact predicate was inline 4 times across
 * admin/users/page.tsx (top-level fields, plus once per nested
 * array-item / object entry).
 */
export function isDisplayableEntry([key, value]: [string, unknown]) {
  return (
    !EXCLUDED_DETAIL_KEYS.includes(key) &&
    value !== null &&
    value !== undefined &&
    typeof value !== "object"
  );
}

export function splitDetailEntries(detail: Record<string, unknown> | null) {
  if (!detail) {
    return { flatEntries: [], arrayEntries: [], objectEntries: [] };
  }

  const entries = Object.entries(detail);

  return {
    flatEntries: entries.filter(isDisplayableEntry),
    arrayEntries: entries.filter(
      ([, value]) => Array.isArray(value) && value.length > 0,
    ),
    objectEntries: entries.filter(
      ([, value]) => value !== null && typeof value === "object" && !Array.isArray(value),
    ),
  };
}
