/** Raw `searchParams` as Next.js hands them to a page. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Builds `<base>?tab=<tab>` and carries over every other query parameter
 * (e.g. prefill values for the "Request a class" form). Used by the old
 * routes that now redirect into a hub tab.
 */
export function buildTabUrl(
  base: string,
  tab: string,
  searchParams: RawSearchParams = {},
): string {
  const qs = new URLSearchParams();
  qs.set("tab", tab);

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "tab" || value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) qs.append(key, v);
  }

  return `${base}?${qs.toString()}`;
}
