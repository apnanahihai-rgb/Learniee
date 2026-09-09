import { NextResponse } from "next/server";

import { requireCognitoAuth } from "@/lib/api-auth";
import { logActivity, actorFromTokenPayload } from "@/features/shared/server/activityLog.service";
import { ActivityActorRole } from "@prisma/client";

/**
 * POST { event: "LOGIN" | "LOGOUT" }
 *
 * The only two Activity Log events that originate client-side rather
 * than from an existing API route — there's no server-side "login"
 * request today (Cognito auth happens directly from the browser via
 * `amazon-cognito-identity-js`, see `useLogin.ts`), and "logout" is
 * just a client-side cookie removal. Both call this endpoint with the
 * `idToken` cookie still attached so `requireCognitoAuth` can resolve
 * who's acting — for LOGOUT, callers must send this *before* removing
 * the cookie client-side.
 *
 * Deliberately a tiny, fixed whitelist (not a generic "log anything"
 * endpoint) so this can't become a bad-actor logging channel.
 */
const ROLE_MAP: Record<string, ActivityActorRole> = {
  parent: ActivityActorRole.PARENT,
  teacher: ActivityActorRole.TEACHER,
  admin: ActivityActorRole.ADMIN,
  accounts: ActivityActorRole.ACCOUNTS,
  hr: ActivityActorRole.HR,
};

export async function POST(req: Request) {
  const auth = requireCognitoAuth(req);

  if ("error" in auth) {
    return auth.error;
  }

  const body = await req.json().catch(() => ({}));
  const event = body?.event;

  if (event !== "LOGIN" && event !== "LOGOUT") {
    return NextResponse.json({ error: "event must be LOGIN or LOGOUT." }, { status: 400 });
  }

  const roleClaim = auth.payload["custom:role"];
  const actorRole = (roleClaim && ROLE_MAP[roleClaim]) || ActivityActorRole.SYSTEM;
  const { actorId, actorName, actorEmail } = actorFromTokenPayload(auth.payload);

  await logActivity({
    action: event === "LOGIN" ? "AUTH_LOGIN" : "AUTH_LOGOUT",
    actorRole,
    actorId,
    actorName,
    actorEmail,
    description: `${actorName ?? actorEmail ?? "A user"} (${roleClaim ?? "unknown role"}) ${
      event === "LOGIN" ? "logged in" : "logged out"
    }.`,
  });

  return NextResponse.json({ success: true });
}
