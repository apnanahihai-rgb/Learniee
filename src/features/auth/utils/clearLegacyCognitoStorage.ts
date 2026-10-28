/**
 * The old single-page-app login (`amazon-cognito-identity-js`) kept tokens in
 * localStorage under `CognitoIdentityServiceProvider.*`. Sessions now live in
 * httpOnly cookies, so those keys are dead weight that still hold old tokens.
 * Removes them. Safe to call any time; never throws (storage can be blocked).
 */
export function clearLegacyCognitoStorage(): void {
  try {
    const stale: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("CognitoIdentityServiceProvider.")) stale.push(key);
    }

    stale.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage unavailable (private mode / blocked): nothing to clean.
  }
}
