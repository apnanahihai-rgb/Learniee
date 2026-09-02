/**
 * Fast2SMS was decided as the SMS/OTP provider (08-PROJECT-KNOWLEDGE-BASE.md)
 * but was not wired anywhere in the codebase before this. This is the first
 * real integration point — requires FAST2SMS_API_KEY to be set, and an
 * approved OTP template/sender ID in the Fast2SMS dashboard for production
 * use (India DLT regulations apply to transactional SMS). Until that's
 * confirmed set up, phone OTP sends will fail loudly rather than silently.
 */

const FAST2SMS_OTP_URL = "https://www.fast2sms.com/dev/bulkV2";

export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    throw new Error("FAST2SMS_API_KEY is not configured.");
  }

  // Fast2SMS expects a bare 10-digit Indian number (no +91) for its
  // standard route — strip any leading country code/spacing.
  const digits = phone.replace(/\D/g, "");
  const localNumber = digits.length > 10 ? digits.slice(-10) : digits;

  const res = await fetch(FAST2SMS_OTP_URL, {
    method: "POST",
    headers: {
      authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route: "otp",
      variables_values: code,
      numbers: localNumber,
    }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok || body?.return !== true) {
    throw new Error(body?.message?.[0] || "Failed to send SMS OTP.");
  }
}
