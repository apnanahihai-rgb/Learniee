/**
 * Chat message screening (06-OPEN-DECISIONS.md #31, reworked Oct 26, 2026).
 *
 * Parents and Teachers must not move a conversation off Learniee by
 * sharing contact details. Screening looks at one message (plus the
 * sender's few most recent messages) and returns one of three levels:
 *
 *  - BLOCKED    — the message is a clear phone number. It is NOT sent and
 *                 NOT shown to the other party; Admin gets a flag.
 *  - SUSPICIOUS — it looks like someone is working around the rule
 *                 (digits spelled as words, digits mixed with words,
 *                 digits split over several messages, digits separated by
 *                 letters, "my whatsapp is …" with digits). The message IS
 *                 sent normally; Admin gets a flag to review.
 *  - CLEAN      — nothing to do.
 *
 * Suspicious never blocks on purpose: these patterns also occur in
 * ordinary tutoring chat (a teacher counting "one two three…", a list of
 * answers), so a human decides, not the detector.
 *
 * Pure functions, no server-only import — safe to unit-test later.
 * The older `maskPhoneNumbers` in `phoneDetection.ts` is untouched and
 * only used for history that was masked before this change.
 */

import { findPhoneNumbers } from "./phoneDetection";

export type ChatScreenLevel = "CLEAN" | "SUSPICIOUS" | "BLOCKED";

export type ChatScreenReason =
  | "PHONE_NUMBER"
  | "SHORT_NUMBER"
  | "LONG_NUMBER"
  | "SPELLED_OUT_DIGITS"
  | "MIXED_DIGITS_AND_WORDS"
  | "SEPARATED_DIGITS"
  | "SPLIT_ACROSS_MESSAGES"
  | "CONTACT_REQUEST_WITH_DIGITS";

/** Plain-language labels for the Admin screen. */
export const CHAT_SCREEN_REASON_LABELS: Record<ChatScreenReason, string> = {
  PHONE_NUMBER: "Phone number",
  SHORT_NUMBER: "Short number (a landline, or part of a number)",
  LONG_NUMBER: "Long number (possibly an international phone number)",
  SPELLED_OUT_DIGITS: "Digits written as words",
  MIXED_DIGITS_AND_WORDS: "Digits mixed with number words",
  SEPARATED_DIGITS: "Digits separated by letters or symbols",
  SPLIT_ACROSS_MESSAGES: "Number split over several messages",
  CONTACT_REQUEST_WITH_DIGITS: "Asks to be contacted, with digits",
};

export interface ChatScreenResult {
  level: ChatScreenLevel;
  reasons: ChatScreenReason[];
  /** Short Admin-facing note (what the digits read as). Null when there is nothing to add. */
  detail: string | null;
}

/** How far back the sender's earlier messages are looked at for a split number. */
export const SPLIT_LOOKBACK_MINUTES = 30;
export const SPLIT_LOOKBACK_MESSAGES = 10;

/** A split number needs at least this many digits in total to be flagged. */
const MIN_SPLIT_DIGITS = 10;
/** A message with more digits than this is not a "fragment" of a split number. */
const MAX_FRAGMENT_DIGITS = 9;
/** A message with more than this many ordinary words is not a bare fragment. */
const MAX_FRAGMENT_OTHER_WORDS = 3;
/** A run of digits made with number words must reach this length to be flagged. */
const MIN_WORD_RUN_DIGITS = 7;

// ---------------------------------------------------------------------------
// Normalising
// ---------------------------------------------------------------------------

// Code points of the "zero" digit of the common numeral systems (ASCII,
// Arabic-Indic, Devanagari, Bengali, Gurmukhi, Gujarati, Odia, Tamil,
// Telugu, Kannada, Malayalam …). NFKC already folds full-width and
// mathematical digits to ASCII; this covers the rest.
const ZERO_CODE_POINTS = [
  0x30, 0x660, 0x6f0, 0x7c0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66, 0xce6, 0xd66,
  0xe50, 0xed0, 0xf20, 0x1040, 0x17e0, 0x1810,
];

function toAsciiDigit(char: string): string {
  const codePoint = char.codePointAt(0);

  if (codePoint === undefined) return char;

  for (const zero of ZERO_CODE_POINTS) {
    if (codePoint >= zero && codePoint <= zero + 9) {
      return String(codePoint - zero);
    }
  }

  return char;
}

/** Folds look-alike characters, strips invisible ones and lower-cases, so every other rule sees plain text. */
export function normalizeChatText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[​-‍⁠﻿­]/g, "")
    .replace(/\p{Nd}/gu, toAsciiDigit)
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Number words
// ---------------------------------------------------------------------------

const DIGIT_WORDS: Record<string, string> = {
  // English
  zero: "0", one: "1", two: "2", three: "3", four: "4",
  five: "5", six: "6", seven: "7", eight: "8", nine: "9",
  tree: "3", fife: "5",
  // Hindi / Marathi, Roman script
  sifar: "0", shunya: "0", shunyam: "0",
  ek: "1", do: "2", don: "2", teen: "3", char: "4", chaar: "4",
  panch: "5", paanch: "5", paach: "5", chhe: "6", chhah: "6", chhey: "6", chah: "6", che: "6", saha: "6",
  saat: "7", sat: "7", aath: "8", ath: "8", aat: "8", nau: "9", nao: "9",
  // Devanagari
  "शून्य": "0", "सिफर": "0",
  "एक": "1", "दो": "2", "दोन": "2", "तीन": "3", "चार": "4",
  "पांच": "5", "पाँच": "5", "पाच": "5",
  "छह": "6", "छः": "6", "छे": "6", "सहा": "6",
  "सात": "7", "आठ": "8", "नौ": "9",
};

// "double nine" = 99, "triple five" = 555.
const MULTIPLIER_WORDS: Record<string, number> = {
  double: 2, dabal: 2, dubal: 2, "डबल": 2,
  triple: 3, tripal: 3, tipal: 3, "ट्रिपल": 3,
};

// "o" / "oh" read as zero only when they sit inside a run of digits.
const ZERO_LETTER_WORDS = new Set(["o", "oh"]);

// Words glued together ("nineeightseven") are split with this list. The
// short, easily-confused words are left out so ordinary words aren't
// mistaken for digits.
const SEGMENT_WORDS = Object.keys(DIGIT_WORDS).filter(
  (word) => /^[a-z]{3,}$/.test(word),
);

function segmentDigitWords(token: string): string | null {
  if (!/^[a-z]{6,}$/.test(token)) return null;

  const memo = new Map<number, string | null>();

  function from(start: number): string | null {
    if (start === token.length) return "";
    if (memo.has(start)) return memo.get(start) ?? null;

    let result: string | null = null;

    for (const word of SEGMENT_WORDS) {
      if (token.startsWith(word, start)) {
        const rest = from(start + word.length);
        if (rest !== null) {
          result = DIGIT_WORDS[word] + rest;
          break;
        }
      }
    }

    memo.set(start, result);
    return result;
  }

  const digits = from(0);

  // At least two words, otherwise it is just an ordinary word like "seven".
  return digits !== null && digits.length >= 2 ? digits : null;
}

// ---------------------------------------------------------------------------
// Tokenising a message into digit runs
// ---------------------------------------------------------------------------

const TOKEN_RE = /(\d)|([\p{L}\p{M}]+)|([^\p{L}\p{M}\d]+)/gu;
const LIGHT_SEPARATOR_RE = /^[\s,.\-_()/\\|:;]+$/;
const MAX_LIGHT_SEPARATOR_LENGTH = 3;

interface DigitRun {
  digits: string;
  /** Digits that came from number words (not typed as digits). */
  wordDigits: number;
  hasWord: boolean;
}

export interface MessageAnalysis {
  normalized: string;
  runs: DigitRun[];
  /** Every digit the message "says", in order (typed or spelled), ignoring one-off stray words. */
  digits: string;
  digitCount: number;
  /** Ordinary words that are not part of a number. */
  otherWordCount: number;
}

function newRun(): DigitRun {
  return { digits: "", wordDigits: 0, hasWord: false };
}

export function analyzeChatText(text: string): MessageAnalysis {
  const normalized = normalizeChatText(text);
  const runs: DigitRun[] = [];
  let run: DigitRun | null = null;
  let pendingMultiplier = 1;
  let otherWordCount = 0;

  function flush() {
    if (run && run.digits.length > 0) runs.push(run);
    run = null;
    pendingMultiplier = 1;
  }

  TOKEN_RE.lastIndex = 0;

  for (const match of normalized.matchAll(TOKEN_RE)) {
    const [, digit, word, separator] = match;

    if (digit !== undefined) {
      run ??= newRun();
      run.digits += digit.repeat(pendingMultiplier);
      pendingMultiplier = 1;
      continue;
    }

    if (word !== undefined) {
      const multiplier = MULTIPLIER_WORDS[word];

      if (multiplier) {
        run ??= newRun();
        run.hasWord = true;
        pendingMultiplier = multiplier;
        continue;
      }

      if (ZERO_LETTER_WORDS.has(word)) {
        if (run && run.digits.length > 0) {
          run.digits += "0".repeat(pendingMultiplier);
          run.wordDigits += pendingMultiplier;
          run.hasWord = true;
          pendingMultiplier = 1;
        } else {
          otherWordCount += 1;
          flush();
        }
        continue;
      }

      const single = DIGIT_WORDS[word];
      const spelled = single ?? segmentDigitWords(word);

      if (spelled !== undefined && spelled !== null) {
        run ??= newRun();
        const piece = spelled.length === 1 ? spelled.repeat(pendingMultiplier) : spelled;
        run.digits += piece;
        run.wordDigits += piece.length;
        run.hasWord = true;
        pendingMultiplier = 1;
        continue;
      }

      otherWordCount += 1;
      flush();
      continue;
    }

    // Anything else: spaces and light punctuation keep a run going.
    if (
      run &&
      separator !== undefined &&
      separator.length <= MAX_LIGHT_SEPARATOR_LENGTH &&
      LIGHT_SEPARATOR_RE.test(separator)
    ) {
      continue;
    }

    flush();
  }

  flush();

  // A lone one- or two-digit number word ("do", "one") is far more likely
  // to be ordinary language than a number, so it is not counted.
  const counted = runs.filter((candidate) => !candidate.hasWord || candidate.digits.length >= 2);
  const digits = counted.map((candidate) => candidate.digits).join("");

  return {
    normalized,
    runs,
    digits,
    digitCount: digits.length,
    otherWordCount,
  };
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

function isDateLike(span: string): boolean {
  return /^\s*\d{1,4}\s*[-./]\s*\d{1,2}\s*[-./]\s*\d{1,4}\s*$/.test(span);
}

function isDecimalLike(span: string): boolean {
  return /^\s*\d+\.\d{1,3}\s*$/.test(span);
}

interface DigitVerdict {
  level: "BLOCKED" | "SUSPICIOUS";
  reason: ChatScreenReason;
}

/**
 * How phone-like a plain string of digits is.
 *  - 10 digits (an Indian mobile or a national number) → blocked
 *  - 0 or 91 + 10 digits (STD / country code) → blocked
 *  - a "+" number of 8–15 digits → blocked
 *  - 11–15 other digits → suspicious (could be international, could be an ID)
 *  - 7–9 digits → suspicious (a landline without its code, or part of a number)
 */
function classifyDigits(digits: string, hasPlus: boolean): DigitVerdict | null {
  const length = digits.length;
  const stripped = digits.replace(/^0+/, "");

  if (length === 10) {
    return { level: "BLOCKED", reason: "PHONE_NUMBER" };
  }

  if (hasPlus && length >= 8 && length <= 15) {
    return { level: "BLOCKED", reason: "PHONE_NUMBER" };
  }

  if (
    length >= 11 &&
    length <= 14 &&
    ((digits.startsWith("0") && stripped.length === 10) ||
      (stripped.startsWith("91") && stripped.length === 12))
  ) {
    return { level: "BLOCKED", reason: "PHONE_NUMBER" };
  }

  if (length >= 11 && length <= 15) {
    return { level: "SUSPICIOUS", reason: "LONG_NUMBER" };
  }

  if (length >= 7 && length <= 9) {
    return { level: "SUSPICIOUS", reason: "SHORT_NUMBER" };
  }

  return null;
}

// "9a8b7c6d5e4f3g2h1i0" — digits kept apart by letters or symbols.
const SEPARATED_DIGITS_RE = /(?:\d\s?[a-z_|~#@*]{1,2}\s?){6,}\d/;

// Asking to be contacted off-platform.
const CONTACT_INTENT_RE =
  /(whats\s?app|watsapp|whatsap|wa\.me|telegram|signal app|call me|phone me|ring me|text me|dm me|reach me|my (?:phone|mobile|cell|contact|whatsapp)\s?(?:no|number|num)?|(?:phone|mobile|contact|whatsapp) (?:no|number|num)\b|number is|mera number|apna number|aapka number|tumhara number|number de)/;
const MIN_CONTACT_INTENT_DIGITS = 3;

/** True when a message is mostly a bit of a number — the kind of thing someone sends when splitting one. */
function isNumberFragment(analysis: MessageAnalysis): boolean {
  return (
    analysis.digitCount >= 1 &&
    analysis.digitCount <= MAX_FRAGMENT_DIGITS &&
    analysis.otherWordCount <= MAX_FRAGMENT_OTHER_WORDS
  );
}

/**
 * Looks for a number dribbled out over several messages ("98", then
 * "76", then "54"…). `previous` is the sender's earlier messages, newest
 * first. Flags once, on the message that takes the total to a phone-length
 * number, so Admin isn't sent one flag per fragment.
 */
function detectSplitNumber(
  current: MessageAnalysis,
  previous: MessageAnalysis[],
): { digits: string; messageCount: number } | null {
  if (!isNumberFragment(current)) return null;

  let before = "";
  let messageCount = 1;
  let skipped = 0;

  for (const earlier of previous) {
    if (isNumberFragment(earlier)) {
      before = earlier.digits + before;
      messageCount += 1;
      skipped = 0;
      continue;
    }

    // Short chatter ("ok", "wait") between fragments doesn't end the chain.
    if (earlier.digitCount === 0 && earlier.otherWordCount <= 4 && skipped < 3) {
      skipped += 1;
      continue;
    }

    break;
  }

  const total = before + current.digits;

  if (messageCount >= 2 && total.length >= MIN_SPLIT_DIGITS && before.length < MIN_SPLIT_DIGITS) {
    return { digits: total, messageCount };
  }

  return null;
}

/**
 * Screens one message. `previousTexts` are the SAME sender's earlier
 * messages in the same room, newest first (the caller limits them to
 * `SPLIT_LOOKBACK_MESSAGES` within `SPLIT_LOOKBACK_MINUTES`).
 */
export function screenChatMessage(text: string, previousTexts: string[] = []): ChatScreenResult {
  const analysis = analyzeChatText(text);
  const reasons = new Set<ChatScreenReason>();
  const details: string[] = [];
  let blocked = false;

  // 1. Phone-shaped spans: "98765 43210", "+91-98765-43210", "(020) 2765 4321".
  for (const span of findPhoneNumbers(analysis.normalized)) {
    if (isDateLike(span.match) || isDecimalLike(span.match)) continue;

    const verdict = classifyDigits(
      span.match.replace(/\D/g, ""),
      span.match.trimStart().startsWith("+"),
    );

    if (!verdict) continue;

    reasons.add(verdict.reason);
    if (verdict.level === "BLOCKED") blocked = true;
  }

  // 2. Typed digits with separators the span finder doesn't allow ("98765,43210", "98765/43210").
  for (const run of analysis.runs) {
    if (run.hasWord) continue;

    const verdict = classifyDigits(run.digits, false);

    if (verdict?.level === "BLOCKED") {
      reasons.add(verdict.reason);
      blocked = true;
    }
  }

  // 3. Digits written (wholly or partly) as words: "nine eight seven six…".
  for (const run of analysis.runs) {
    if (!run.hasWord || run.digits.length < MIN_WORD_RUN_DIGITS) continue;

    const wholly = run.wordDigits === run.digits.length;
    reasons.add(wholly ? "SPELLED_OUT_DIGITS" : "MIXED_DIGITS_AND_WORDS");
    details.push(`Reads as: ${run.digits}`);
  }

  // 4. Digits kept apart by letters / symbols.
  if (SEPARATED_DIGITS_RE.test(analysis.normalized)) {
    reasons.add("SEPARATED_DIGITS");
  }

  // 5. "my whatsapp is …" together with some digits.
  if (CONTACT_INTENT_RE.test(analysis.normalized) && analysis.digitCount >= MIN_CONTACT_INTENT_DIGITS) {
    reasons.add("CONTACT_REQUEST_WITH_DIGITS");
  }

  // 6. A number split over several messages.
  const split = detectSplitNumber(
    analysis,
    previousTexts.map((previousText) => analyzeChatText(previousText)),
  );

  if (split) {
    reasons.add("SPLIT_ACROSS_MESSAGES");
    details.push(`Pieced together from ${split.messageCount} recent messages: ${split.digits}`);
  }

  const level: ChatScreenLevel = blocked ? "BLOCKED" : reasons.size > 0 ? "SUSPICIOUS" : "CLEAN";

  return {
    level,
    reasons: Array.from(reasons),
    detail: details.length > 0 ? details.join(" · ") : null,
  };
}
