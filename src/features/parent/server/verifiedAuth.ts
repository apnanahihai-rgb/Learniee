import { NextResponse } from "next/server";
import { CognitoJwtVerifier } from "aws-jwt-verify";

import { getIdTokenFromRequest, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * Signature-verified counterpart to
 * `features/parent/server/auth.ts`'s `requireParentId()`.
 *
 * 06-OPEN-DECISIONS.md #21 flags that JWT signature verification is
 * still decode-only for every Parent/Teacher route, and explicitly
 * calls out "any route handling real payments" as blocked on that
 * being finished. Rather than rewrite JWT handling across every
 * Parent route in this pass, this file adds a properly
 * signature-verified path (same `aws-jwt-verify` +
 * `CognitoJwtVerifier` pattern already used for Admin in
 * `verifyAdmin.ts`) and wires it into ONLY the four Razorpay
 * order/verify routes, where a forged token would mean real money
 * moving under someone else's name. Every other Parent route is
 * unchanged and still decode-only — that broader gap is still open.
 */
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  tokenUse: "id",
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
});

export async function requireVerifiedParentId(
  req: Request,
): Promise<{ parentId: string } | { error: NextResponse }> {
  const token = getIdTokenFromRequest(req);

  if (!token) {
    return { error: unauthorizedResponse() };
  }

  let payload;

  try {
    // Unlike jwtDecode, this actually validates the signature
    // against Cognito's public keys (and checks exp/aud/iss) —
    // a forged token gets rejected here instead of being trusted.
    payload = await verifier.verify(token);
  } catch {
    return {
      error: unauthorizedResponse("Invalid or expired session. Please login again."),
    };
  }

  if (payload["custom:role"] !== "parent") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const parent = await prisma.parentProfile.findUnique({
    where: { cognitoSub: payload.sub },
    select: { id: true },
  });

  if (!parent) {
    return {
      error: NextResponse.json(
        { error: "Complete onboarding first." },
        { status: 400 },
      ),
    };
  }

  return { parentId: parent.id };
}
