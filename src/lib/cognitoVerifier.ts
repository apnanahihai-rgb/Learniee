import { CognitoJwtVerifier } from "aws-jwt-verify";

import { getCognitoConfig } from "@/lib/cognitoConfig";

/**
 * One shared, signature-verifying Cognito ID-token verifier for the Admin /
 * Parent / Teacher / staff routes (06-OPEN-DECISIONS.md #21).
 *
 * `aws-jwt-verify` caches Cognito's public keys inside the verifier
 * instance, so everything uses this single instance instead of creating a new
 * one per helper.
 *
 * Created on first use (not at import) so the pool / client ids are read from
 * the runtime environment - works in Docker, and `next build` does not need
 * Cognito env vars. The app client is the "traditional web application" one;
 * its id is the `aud` of every ID token it issues.
 */
function createVerifier() {
  const { userPoolId, clientId } = getCognitoConfig();

  return CognitoJwtVerifier.create({ userPoolId, tokenUse: "id", clientId });
}

let verifier: ReturnType<typeof createVerifier> | undefined;

function getVerifier() {
  verifier ??= createVerifier();
  return verifier;
}

export const idTokenVerifier = {
  verify(token: string) {
    return getVerifier().verify(token);
  },
};
