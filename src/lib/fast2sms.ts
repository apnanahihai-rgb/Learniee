/**
 * Fast2SMS OTP sender (DLT route).
 *
 * Required env vars (server-side only):
 *   FAST2SMS_API_KEY     - Fast2SMS dashboard -> Dev API -> API key
 *   FAST2SMS_SENDER_ID   - your DLT-approved header (6-letter sender ID)
 *   FAST2SMS_TEMPLATE_ID - the Fast2SMS "message ID" of your approved OTP template
 *
 * Your template must contain exactly one variable ({#var#}) = the OTP.
 */

const FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const apiKey = requireEnv("FAST2SMS_API_KEY");
  const senderId = requireEnv("FAST2SMS_SENDER_ID");
  const templateId = requireEnv("FAST2SMS_TEMPLATE_ID");

  // Fast2SMS wants a bare 10-digit Indian number (no +91).
  // Only +91 numbers can be texted; never trim a foreign number to its last 10 digits.
  if (!phone.trim().startsWith("+91")) {
    throw new Error("SMS OTP is only available for Indian (+91) numbers.");
  }
  const digits = phone.replace(/\D/g, "");
  const localNumber = digits.length > 10 ? digits.slice(-10) : digits;
  if (localNumber.length !== 10) {
    throw new Error("Phone number must be a 10-digit Indian mobile number.");
  }

  const res = await fetch(FAST2SMS_URL, {
    method: "POST",
    headers: {
      authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      route: "dlt",
      sender_id: senderId,
      message: templateId,
      variables_values: code,
      numbers: localNumber,
      flash: 0,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok || body?.return !== true) {
    const detail = Array.isArray(body?.message) ? body.message[0] : body?.message;
    console.error("[fast2sms] send failed", res.status, detail);
    throw new Error("Could not send the SMS OTP. Please try again.");
  }
}
