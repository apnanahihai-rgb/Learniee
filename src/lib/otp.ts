import crypto from "crypto";

/**
 * Stateless OTP tokens: the 6-digit code is never stored anywhere.
 * `signOtpToken` returns an opaque token that embeds an HMAC of
 * {target, purpose, code, expiry}. `verifyOtpCode`/`verifyOtpToken`
 * recompute the HMAC to check a submitted code (or a previously-verified
 * token) without needing a database row or server memory — safe across
 * multiple serverless instances and survives a redeploy mid-flow.
 *
 * Requires OTP_SECRET to be set (a long random string, server-side only).
 */

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const VERIFIED_TOKEN_TTL_MS = 15 * 60 * 1000; // grace period to submit the create-account form

function getSecret(): string {
  const secret = process.env.OTP_SECRET;
  if (!secret) {
    throw new Error("OTP_SECRET is not configured.");
  }
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function generateOtpCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Returns an opaque "challenge token" to hand back to the client after
 * sending `code` to `target` (email or phone). The client never sees
 * `code` in this token — only the signature.
 */
export function signOtpChallenge(target: string, purpose: string, code: string): string {
  const expiresAt = Date.now() + OTP_TTL_MS;
  const payload = `${target}|${purpose}|${code}|${expiresAt}`;
  const sig = sign(payload);
  const raw = `${target}|${purpose}|${code}|${expiresAt}|${sig}`;
  return Buffer.from(raw).toString("base64url");
}

/**
 * Verifies a user-submitted code against a challenge token. On success,
 * returns a short-lived "verified token" proving {target, purpose} was
 * confirmed, which the create-account endpoint checks before writing
 * anything to Cognito/DB.
 */
export function verifyOtpChallenge(
  challengeToken: string,
  submittedCode: string,
): { ok: true; verifiedToken: string } | { ok: false; error: string } {
  let raw: string;
  try {
    raw = Buffer.from(challengeToken, "base64url").toString("utf8");
  } catch {
    return { ok: false, error: "Invalid or corrupted verification token." };
  }

  const parts = raw.split("|");
  if (parts.length !== 5) {
    return { ok: false, error: "Invalid or corrupted verification token." };
  }
  const [target, purpose, code, expiresAtStr, sig] = parts;

  const expected = sign(`${target}|${purpose}|${code}|${expiresAtStr}`);
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return { ok: false, error: "Invalid verification token." };
  }

  if (Date.now() > Number(expiresAtStr)) {
    return { ok: false, error: "This code has expired. Please request a new one." };
  }

  if (submittedCode.trim() !== code) {
    return { ok: false, error: "Incorrect code." };
  }

  const verifiedExpiresAt = Date.now() + VERIFIED_TOKEN_TTL_MS;
  const verifiedPayload = `${target}|${purpose}|verified|${verifiedExpiresAt}`;
  const verifiedSig = sign(verifiedPayload);
  const verifiedToken = Buffer.from(`${verifiedPayload}|${verifiedSig}`).toString("base64url");

  return { ok: true, verifiedToken };
}

/**
 * Checks a "verified token" (produced above) matches the expected
 * target/purpose and hasn't expired. Used right before creating the
 * Cognito user, so a stale or mismatched target can't sneak through.
 */
export function checkVerifiedToken(
  verifiedToken: string,
  expectedTarget: string,
  expectedPurpose: string,
): boolean {
  let raw: string;
  try {
    raw = Buffer.from(verifiedToken, "base64url").toString("utf8");
  } catch {
    return false;
  }

  const parts = raw.split("|");
  if (parts.length !== 5) return false;
  const [target, purpose, marker, expiresAtStr, sig] = parts;

  if (marker !== "verified") return false;
  if (target !== expectedTarget || purpose !== expectedPurpose) return false;

  const expected = sign(`${target}|${purpose}|${marker}|${expiresAtStr}`);
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;

  return Date.now() <= Number(expiresAtStr);
}

export function generateTempPassword(): string {
  // Cognito default password policy: 8+ chars, upper, lower, number, symbol.
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*";
  const all = upper + lower + digits + symbols;

  const pick = (set: string) => set[crypto.randomInt(0, set.length)];

  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const rest = Array.from({ length: 8 }, () => pick(all));

  const chars = [...required, ...rest];
  // Fisher-Yates shuffle so the required chars aren't always at the front.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}
