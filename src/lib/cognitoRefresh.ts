import { jwtDecode } from "jwt-decode";

import { getCognitoConfig } from "@/lib/cognitoConfig";
import { computeSecretHash } from "@/lib/cognitoSecretHash";

/**
 * Token renewal for `middleware.ts`.
 *
 * Plain `fetch` to Cognito's public InitiateAuth endpoint (no AWS SDK) so it
 * runs in the middleware runtime. Needs the app client secret, which is why
 * this app client has to be a "traditional web application" client.
 */
interface RefreshClaims {
  exp?: number;
  "cognito:username"?: string;
  username?: string;
}

export function decodeClaims(token: string | undefined): RefreshClaims | null {
  if (!token) return null;

  try {
    return jwtDecode<RefreshClaims>(token);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string | undefined, skewSeconds = 30): boolean {
  const exp = decodeClaims(token)?.exp;
  return typeof exp !== "number" || exp * 1000 <= Date.now() + skewSeconds * 1000;
}

export type RefreshResult =
  | { status: "ok"; idToken: string; accessToken: string }
  /** Cognito refused the refresh token (expired / revoked): the session is over. */
  | { status: "invalid" }
  /** Network or Cognito outage / misconfiguration: try again later, keep the cookies. */
  | { status: "error" };

/**
 * Exchanges the refresh token for a new ID + access token.
 *
 * `usernameSource` is the (possibly expired) ID or access token: Cognito wants
 * the SECRET_HASH built from the user's internal username, which is the
 * `cognito:username` / `username` claim - NOT necessarily the email.
 */
export async function refreshSessionTokens(
  refreshToken: string,
  usernameSource: string | undefined,
): Promise<RefreshResult> {
  const { clientId, clientSecret, region } = getCognitoConfig();
  const claims = decodeClaims(usernameSource);
  const username = claims?.["cognito:username"] ?? claims?.username;

  if (!clientId || !clientSecret || !region) return { status: "error" };
  if (!username) return { status: "invalid" };

  try {
    const secretHash = await computeSecretHash(username, clientId, clientSecret);

    const res = await fetch(`https://cognito-idp.${region}.amazonaws.com/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
      },
      body: JSON.stringify({
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: clientId,
        AuthParameters: { REFRESH_TOKEN: refreshToken, SECRET_HASH: secretHash },
      }),
      cache: "no-store",
    });

    if (res.status === 400 || res.status === 401) return { status: "invalid" };
    if (!res.ok) return { status: "error" };

    const data = (await res.json()) as {
      AuthenticationResult?: { IdToken?: string; AccessToken?: string };
    };
    const result = data.AuthenticationResult;

    if (!result?.IdToken || !result?.AccessToken) return { status: "error" };

    return { status: "ok", idToken: result.IdToken, accessToken: result.AccessToken };
  } catch (err) {
    console.error("Cognito token refresh failed:", err);
    return { status: "error" };
  }
}
