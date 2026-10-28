/**
 * SECRET_HASH that Cognito requires on every call made with an app client
 * that has a client secret:  Base64( HMAC-SHA256( clientSecret, username + clientId ) ).
 *
 * Uses Web Crypto so the same code runs in Node route handlers and in
 * `middleware.ts` (edge-compatible, no Node-only imports).
 *
 * `username` must be the exact username Cognito knows the user by. If the pool
 * signs users in with email, that is the email for sign-up / sign-in / forgot
 * password, but the internal username (the `cognito:username` claim in the
 * token) for token refresh and auth challenges.
 */
export async function computeSecretHash(
  username: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(clientSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(username + clientId));

  let binary = "";
  for (const byte of new Uint8Array(signature)) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}
