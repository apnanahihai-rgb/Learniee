import { clearLegacyCognitoStorage } from "@/features/auth/utils/clearLegacyCognitoStorage";

/**
 * Ends the login session. The tokens live in httpOnly cookies the browser
 * cannot touch, so the server clears them (and revokes the refresh token at
 * Cognito) via `/api/auth/logout`.
 *
 * Call `logClientActivity("LOGOUT")` BEFORE this - that route needs the
 * cookie to know who is logging out. Never throws: logout must always
 * complete, whatever the network does.
 */
export async function endSession(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (err) {
    console.error("endSession failed:", err);
  }

  clearLegacyCognitoStorage();
}
