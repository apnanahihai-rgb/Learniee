/**
 * One-off: force-set a permanent password for a Cognito user that's stuck
 * in FORCE_CHANGE_PASSWORD status without a usable temp password (e.g. the
 * "Account Created" screen closed before the temp password was seen, and
 * the confirmation email never sent). Cognito blocks the normal
 * forgot-password flow for users in this state ("User password cannot be
 * reset in the current state"), so this bypasses both paths directly.
 *
 * Sets Permanent: true — the user can log in immediately with the password
 * you choose, no forced first-login password-change step.
 *
 * Usage:
 *   set STAFF_EMAIL and STAFF_NEW_PASSWORD env vars, then:
 *   npx tsx scripts/resetStaffPassword.ts
 */
import "dotenv/config";
import {
  CognitoIdentityProviderClient,
  AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

const email = process.env.STAFF_EMAIL!;
const newPassword = process.env.STAFF_NEW_PASSWORD!;

async function main() {
  if (!email || !newPassword) {
    throw new Error("Set STAFF_EMAIL and STAFF_NEW_PASSWORD env vars before running this.");
  }
  if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    throw new Error("Password must be 8+ chars with an uppercase letter, lowercase letter, and number.");
  }

  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      Password: newPassword,
      Permanent: true,
    }),
  );

  console.log(`Password reset for ${email}. They can log in immediately with the new password.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
