import { CognitoJwtVerifier } from "aws-jwt-verify";

/**
 * One shared, signature-verifying Cognito ID-token verifier for the
 * Parent / Teacher / shared routes (06-OPEN-DECISIONS.md #21).
 *
 * `aws-jwt-verify` caches Cognito's public keys inside the verifier
 * instance, so use this single instance instead of creating a new one per
 * helper.
 */
export const idTokenVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  tokenUse: "id",
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
});
