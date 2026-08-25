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