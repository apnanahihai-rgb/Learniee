/**
 * Cognito settings for the "traditional web application" app client
 * (an app client WITH a client secret; every Cognito call happens on the
 * server, the browser never talks to Cognito).
 *
 * Plain function (not module-level constants) so values are read at runtime —
 * works in Docker/self-hosted setups where env vars are not baked in at build.
 * Never throws on import: tests and `next build` run without Cognito env vars.
 * Code that actually calls Cognito uses `requireCognitoConfig()`.
 *
 * Env vars:
 *   COGNITO_USER_POOL_ID    e.g. ap-south-1_XXXXXXXXX
 *   COGNITO_CLIENT_ID       app client id
 *   COGNITO_CLIENT_SECRET   app client secret (server-only, never NEXT_PUBLIC_)
 *   AWS_REGION              optional - derived from the pool id when unset
 * The old NEXT_PUBLIC_COGNITO_USER_POOL_ID / NEXT_PUBLIC_COGNITO_CLIENT_ID are
 * still read as a fallback so existing deployments keep verifying tokens.
 */
export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  clientSecret: string;
  region: string;
}

export function getCognitoConfig(): CognitoConfig {
  const userPoolId =
    process.env.COGNITO_USER_POOL_ID ?? process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "";
  const clientId =
    process.env.COGNITO_CLIENT_ID ?? process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "";
  const clientSecret = process.env.COGNITO_CLIENT_SECRET ?? "";
  const region = process.env.AWS_REGION || userPoolId.split("_")[0] || "";

  return { userPoolId, clientId, clientSecret, region };
}

export function requireCognitoConfig(): CognitoConfig {
  const config = getCognitoConfig();
  const missing: string[] = [];

  if (!config.userPoolId) missing.push("COGNITO_USER_POOL_ID");
  if (!config.clientId) missing.push("COGNITO_CLIENT_ID");
  if (!config.clientSecret) missing.push("COGNITO_CLIENT_SECRET");
  if (!config.region) missing.push("AWS_REGION");

  if (missing.length > 0) {
    throw new Error(`Cognito is not configured. Missing env var(s): ${missing.join(", ")}.`);
  }

  return config;
}
