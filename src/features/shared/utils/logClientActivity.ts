/**
 * Fires the client-log activity event (`AUTH_LOGIN` / `AUTH_LOGOUT`
 * — see `/api/activity/client-log`). Used from `useLogin.ts` right
 * after the `idToken` cookie is set, and from the Parent/Teacher
 * navbars right before it's removed on logout.
 *
 * Deliberately fire-and-forget from the caller's point of view: it's
 * `await`-able (so LOGOUT can be awaited before the cookie is
 * cleared, since the route needs that cookie to identify who's
 * logging out), but never throws — a logging hiccup must never block
 * login/logout for the user.
 */
export async function logClientActivity(event: "LOGIN" | "LOGOUT"): Promise<void> {
  try {
    await fetch("/api/activity/client-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
    });
  } catch (err) {
    console.error(`logClientActivity(${event}) failed:`, err);
  }
}
