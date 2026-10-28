# Cognito: traditional web application client

Learniee signs users in through **our own server routes** (`/api/auth/*`), using a
Cognito app client **with a client secret** ("Traditional web application").
The browser never talks to Cognito and never holds a token it can read.

## How it works

| Step | What happens |
|---|---|
| Login | `POST /api/auth/login` -> `InitiateAuth` (`USER_PASSWORD_AUTH` + `SECRET_HASH`). Tokens go into **httpOnly** cookies: `idToken`, `accessToken`, `refreshToken`, plus a readable, non-sensitive `viewerRole` hint for UI only |
| First staff login | Login answers `NEW_PASSWORD_REQUIRED`; the challenge is kept in a 3-minute httpOnly cookie; `POST /api/auth/new-password` finishes it |
| Sign up / confirm / resend | `/api/auth/signup`, `/confirm`, `/resend-code` (role is whitelisted to `parent` / `teacher` on the server) |
| Forgot password | `/api/auth/forgot-password`, `/api/auth/reset-password` |
| Change password | `/api/auth/change-password` (uses the `accessToken` cookie) |
| Renewal | `middleware.ts` swaps the refresh token for fresh tokens when the ID token has expired (pages **and** `/api/*`), so users stay logged in until the refresh token expires |
| Logout | `POST /api/auth/logout` revokes the refresh token and clears all cookies |
| Verification | Unchanged: every API route still verifies the ID token signature (`aws-jwt-verify`) and `custom:role` |

## Cognito console setup (new app client)

1. User pool -> **App clients** -> **Create app client** -> type **Traditional web application** (generates a **client secret**).
2. **Authentication flows:** enable `ALLOW_USER_PASSWORD_AUTH` and `ALLOW_REFRESH_TOKEN_AUTH`. (SRP / admin flows are not needed.)
3. **Token expiration:** ID + access token 1 hour is fine. Refresh token validity should match `AUTH_SESSION_DAYS` (default 30).
4. **Refresh token rotation: leave OFF** (several parallel requests may renew at once).
5. **Token revocation:** enabled (used by logout).
6. **Prevent user existence errors:** enabled.
7. **Attribute permissions:** the client needs *read* + *write* on `email`, `given_name`, `family_name`, `phone_number`, `custom:role` (sign-up writes them) and *read* on `sub`, `email_verified`.
8. The **same pool** keeps working: existing users and the Admin API calls (`cognitoAdmin.ts`) are unaffected.

## Environment variables

```
COGNITO_USER_POOL_ID=ap-south-1_XXXXXXXXX
COGNITO_CLIENT_ID=<new app client id>
COGNITO_CLIENT_SECRET=<new app client secret>      # server-only, never NEXT_PUBLIC_
AWS_REGION=ap-south-1                               # already set
# optional
AUTH_SESSION_DAYS=30
AUTH_COOKIE_SECURE=true|false                       # default: true in production
```

`NEXT_PUBLIC_COGNITO_USER_POOL_ID` / `NEXT_PUBLIC_COGNITO_CLIENT_ID` are no longer
needed (still read as a fallback, so remove them once the new client works).
Set the same variables in Vercel and in the Docker `.env`.

## Rollout notes

- Everyone has to log in once after deploy (the old browser-side session is not reused).
- Behind HTTPS only: with `NODE_ENV=production` cookies are `Secure`. For plain-HTTP testing of a production build set `AUTH_COOKIE_SECURE=false`.
- Optional clean-up: `npm uninstall amazon-cognito-identity-js` (no longer imported).
