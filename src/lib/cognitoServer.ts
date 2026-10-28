import "server-only";

import { NextResponse } from "next/server";
import {
  CognitoIdentityProviderClient,
  ChangePasswordCommand,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  RespondToAuthChallengeCommand,
  RevokeTokenCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

import { requireCognitoConfig } from "@/lib/cognitoConfig";
import { computeSecretHash } from "@/lib/cognitoSecretHash";

/**
 * Every user-facing Cognito call (sign up, confirm, login, forgot / change
 * password, logout) in one server-only place. The browser only talks to our
 * own `/api/auth/*` routes; the app client secret never leaves the server.
 * (Admin-side calls - create / delete / reset a user - stay in `cognitoAdmin.ts`.)
 *
 * None of these Cognito operations need AWS credentials: they are the public
 * user-pool APIs, authorised by the client id + SECRET_HASH.
 */
let client: CognitoIdentityProviderClient | null = null;

function getClient(): CognitoIdentityProviderClient {
  if (!client) {
    client = new CognitoIdentityProviderClient({ region: requireCognitoConfig().region });
  }
  return client;
}

async function secretHashFor(username: string): Promise<string> {
  const { clientId, clientSecret } = requireCognitoConfig();
  return computeSecretHash(username, clientId, clientSecret);
}

export interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
}

export type LoginResult =
  | { kind: "tokens"; tokens: AuthTokens }
  | { kind: "newPasswordRequired"; session: string; username: string };

interface AuthenticationResultLike {
  IdToken?: string;
  AccessToken?: string;
  RefreshToken?: string;
}

function toTokens(result: AuthenticationResultLike | undefined): AuthTokens {
  if (!result?.IdToken || !result.AccessToken || !result.RefreshToken) {
    throw new Error("Cognito did not return a full set of tokens.");
  }

  return {
    idToken: result.IdToken,
    accessToken: result.AccessToken,
    refreshToken: result.RefreshToken,
  };
}

export async function signUpUser(input: {
  email: string;
  password: string;
  attributes: Record<string, string>;
}): Promise<void> {
  const { clientId } = requireCognitoConfig();

  await getClient().send(
    new SignUpCommand({
      ClientId: clientId,
      SecretHash: await secretHashFor(input.email),
      Username: input.email,
      Password: input.password,
      UserAttributes: [
        { Name: "email", Value: input.email },
        ...Object.entries(input.attributes).map(([Name, Value]) => ({ Name, Value })),
      ],
    }),
  );
}

export async function confirmSignUpUser(email: string, code: string): Promise<void> {
  const { clientId } = requireCognitoConfig();

  await getClient().send(
    new ConfirmSignUpCommand({
      ClientId: clientId,
      SecretHash: await secretHashFor(email),
      Username: email,
      ConfirmationCode: code,
    }),
  );
}

export async function resendSignUpCode(email: string): Promise<void> {
  const { clientId } = requireCognitoConfig();

  await getClient().send(
    new ResendConfirmationCodeCommand({
      ClientId: clientId,
      SecretHash: await secretHashFor(email),
      Username: email,
    }),
  );
}

/**
 * Password login (USER_PASSWORD_AUTH, needs `ALLOW_USER_PASSWORD_AUTH` on the
 * app client). Staff created with a temporary password come back as
 * `newPasswordRequired`.
 */
export async function loginWithPassword(email: string, password: string): Promise<LoginResult> {
  const { clientId } = requireCognitoConfig();

  const res = await getClient().send(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: await secretHashFor(email),
      },
    }),
  );

  if (res.ChallengeName === "NEW_PASSWORD_REQUIRED" && res.Session) {
    return {
      kind: "newPasswordRequired",
      session: res.Session,
      // The challenge must be answered with Cognito's internal username.
      username: res.ChallengeParameters?.USER_ID_FOR_SRP ?? email,
    };
  }

  if (res.ChallengeName) {
    throw new UnsupportedChallengeError(res.ChallengeName);
  }

  return { kind: "tokens", tokens: toTokens(res.AuthenticationResult) };
}

export class UnsupportedChallengeError extends Error {
  constructor(challenge: string) {
    super(`Unsupported sign-in step (${challenge}). Please contact support.`);
    this.name = "UnsupportedChallengeError";
  }
}

export async function completeNewPassword(input: {
  username: string;
  session: string;
  newPassword: string;
}): Promise<AuthTokens> {
  const { clientId } = requireCognitoConfig();

  const res = await getClient().send(
    new RespondToAuthChallengeCommand({
      ClientId: clientId,
      ChallengeName: "NEW_PASSWORD_REQUIRED",
      Session: input.session,
      ChallengeResponses: {
        USERNAME: input.username,
        NEW_PASSWORD: input.newPassword,
        SECRET_HASH: await secretHashFor(input.username),
      },
    }),
  );

  return toTokens(res.AuthenticationResult);
}

export async function startForgotPassword(email: string): Promise<void> {
  const { clientId } = requireCognitoConfig();

  await getClient().send(
    new ForgotPasswordCommand({
      ClientId: clientId,
      SecretHash: await secretHashFor(email),
      Username: email,
    }),
  );
}

export async function finishForgotPassword(input: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<void> {
  const { clientId } = requireCognitoConfig();

  await getClient().send(
    new ConfirmForgotPasswordCommand({
      ClientId: clientId,
      SecretHash: await secretHashFor(input.email),
      Username: input.email,
      ConfirmationCode: input.code,
      Password: input.newPassword,
    }),
  );
}

export async function changeUserPassword(input: {
  accessToken: string;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await getClient().send(
    new ChangePasswordCommand({
      AccessToken: input.accessToken,
      PreviousPassword: input.currentPassword,
      ProposedPassword: input.newPassword,
    }),
  );
}

/** Best effort: revokes this device's refresh token (and the access tokens issued from it). */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  try {
    const { clientId, clientSecret } = requireCognitoConfig();

    await getClient().send(
      new RevokeTokenCommand({
        ClientId: clientId,
        ClientSecret: clientSecret,
        Token: refreshToken,
      }),
    );
  } catch (err) {
    // Logging out must never fail because Cognito did.
    console.error("Cognito RevokeToken failed:", err);
  }
}

/**
 * Turns a Cognito / config error into a clean JSON response. Messages for
 * expected user mistakes are passed through; anything unexpected is logged
 * server-side and answered generically (no internals leak to the browser).
 */
export function cognitoErrorResponse(err: unknown): NextResponse {
  const name = err instanceof Error ? err.name : "";
  const message = err instanceof Error ? err.message : "";

  switch (name) {
    case "NotAuthorizedException":
    case "UserNotFoundException":
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    case "UserNotConfirmedException":
      return NextResponse.json(
        { error: "Your email is not verified yet.", code: "USER_NOT_CONFIRMED" },
        { status: 403 },
      );
    case "CodeMismatchException":
      return NextResponse.json({ error: "That verification code is not correct." }, { status: 400 });
    case "ExpiredCodeException":
      return NextResponse.json(
        { error: "That verification code has expired. Request a new one." },
        { status: 400 },
      );
    case "UsernameExistsException":
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    case "InvalidPasswordException":
    case "InvalidParameterException":
      return NextResponse.json({ error: message || "Invalid request." }, { status: 400 });
    case "LimitExceededException":
    case "TooManyRequestsException":
    case "TooManyFailedAttemptsException":
      return NextResponse.json(
        { error: "Too many attempts. Please wait a while and try again." },
        { status: 429 },
      );
    case "UnsupportedChallengeError":
      return NextResponse.json({ error: message }, { status: 400 });
    default:
      console.error("Cognito auth call failed:", err);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
  }
}
