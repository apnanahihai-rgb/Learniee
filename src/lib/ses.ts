import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

/**
 * Requires SES to be set up in the AWS account (verified sender identity,
 * and out of the SES sandbox if recipients aren't pre-verified too) —
 * see 06-OPEN-DECISIONS.md / flag this to Aman if emails aren't arriving,
 * it's almost certainly SES sandbox mode, not a code bug.
 */

const client = new SESClient({ region: process.env.AWS_REGION });

const FROM_EMAIL = process.env.SES_FROM_EMAIL;

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  if (!FROM_EMAIL) {
    throw new Error("SES_FROM_EMAIL is not configured.");
  }

  await client.send(
    new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: "Your Learniee verification code" },
        Body: {
          Text: {
            Data: `Your verification code is ${code}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
          },
        },
      },
    }),
  );
}

export async function sendTempPasswordEmail(
  to: string,
  firstName: string,
  tempPassword: string,
): Promise<void> {
  if (!FROM_EMAIL) {
    throw new Error("SES_FROM_EMAIL is not configured.");
  }

  await client.send(
    new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: "Your Learniee staff account" },
        Body: {
          Text: {
            Data: `Hi ${firstName},\n\nAn admin has created a Learniee staff account for you.\n\nEmail: ${to}\nTemporary password: ${tempPassword}\n\nLog in at the Learniee login page — you'll be asked to set a new password on first login.`,
          },
        },
      },
    }),
  );
}
