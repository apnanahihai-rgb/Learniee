import { CognitoJwtVerifier } from "aws-jwt-verify";
import { cookies } from "next/headers";

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  tokenUse: "id",
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
});

export async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("idToken")?.value;
  if (!token) return null;

  try {
    const payload = await verifier.verify(token);
    if (payload["custom:role"] !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Same as requireAdmin(), but also allows the "accounts" staff role.
 * Used by routes/pages that expose financial data (Accounts export,
 * Accounts dashboard) to both Admin and Accounts logins, and no one else.
 * Signature-verified (not decode-only) since this is money-adjacent data —
 * see 06-OPEN-DECISIONS.md #21.
 */
export async function requireAdminOrAccounts() {
  const cookieStore = await cookies();
  const token = cookieStore.get("idToken")?.value;
  if (!token) return null;

  try {
    const payload = await verifier.verify(token);
    const role = payload["custom:role"];
    if (role !== "admin" && role !== "accounts") return null;
    return payload;
  } catch {
    return null;
  }
}