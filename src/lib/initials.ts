// Grapheme-aware initials: charAt(0)/[0] splits emoji and some non-Latin letters in half and renders "�".
const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function firstGrapheme(word: string): string {
  if (segmenter) {
    for (const { segment } of segmenter.segment(word)) return segment;
    return "";
  }
  return Array.from(word)[0] ?? "";
}

/** First visible character of a name, upper-cased. Falls back when the name is empty. */
export function getInitial(name: string | null | undefined, fallback = "?"): string {
  const first = firstGrapheme((name ?? "").trim());
  return first ? first.toLocaleUpperCase() : fallback;
}

/** Up to two initials: first word + last word ("Aleksandra Wiśniewska-Kowalczyk" → "AW"). */
export function getInitials(name: string | null | undefined, fallback = "?"): string {
  const words = (name ?? "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return fallback;
  const picked = words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]];
  return picked.map((w) => firstGrapheme(w).toLocaleUpperCase()).join("");
}
