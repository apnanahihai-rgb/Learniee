/**
 * One-off: send a SMALL real test payout through RazorpayX (default ₹1).
 * Does not touch the database or any ledger row — it only calls RazorpayX.
 *
 * Usage (from the repo root, with the same env vars the app uses in .env):
 *   set TEST_PAYOUT_NAME, TEST_PAYOUT_ACCOUNT, TEST_PAYOUT_IFSC, TEST_PAYOUT_EMAIL
 *   (optional: TEST_PAYOUT_PHONE, TEST_PAYOUT_AMOUNT — default 1, max 10)
 *
 *   npm run payout:test              # checks config only, sends nothing
 *   npm run payout:test -- --confirm # actually sends the payout
 *
 * Uses `--conditions=react-server` (see package.json) so the `server-only`
 * import inside src/lib/razorpayX.ts doesn't throw outside Next.js.
 */
import "dotenv/config";

import {
  createContact,
  createFundAccount,
  createPayout,
  describePayoutFailure,
  fetchPayout,
  RazorpayXError,
} from "../src/lib/razorpayX";

const REQUIRED = [
  "RAZORPAYX_KEY_ID",
  "RAZORPAYX_KEY_SECRET",
  "RAZORPAYX_ACCOUNT_NUMBER",
  "TEST_PAYOUT_NAME",
  "TEST_PAYOUT_ACCOUNT",
  "TEST_PAYOUT_IFSC",
  "TEST_PAYOUT_EMAIL",
];
const MAX_TEST_AMOUNT = 10;
const FINAL = new Set(["processed", "failed", "rejected", "reversed", "cancelled"]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const missing = REQUIRED.filter((name) => !process.env[name]?.trim());

  if (missing.length > 0) {
    console.error(`Missing env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  const amount = Number(process.env.TEST_PAYOUT_AMOUNT ?? "1");

  if (!Number.isFinite(amount) || amount < 1 || amount > MAX_TEST_AMOUNT) {
    console.error(`TEST_PAYOUT_AMOUNT must be between 1 and ${MAX_TEST_AMOUNT} (rupees).`);
    process.exit(1);
  }

  const account = process.env.TEST_PAYOUT_ACCOUNT!.trim();
  const masked = `${"*".repeat(Math.max(account.length - 4, 0))}${account.slice(-4)}`;

  console.log(
    `Config OK. Would pay ₹${amount} to ${process.env.TEST_PAYOUT_NAME} (${masked}, ${process.env.TEST_PAYOUT_IFSC}) ` +
      `via ${process.env.RAZORPAYX_PAYOUT_MODE ?? "IMPS"}.`,
  );

  if (!process.argv.includes("--confirm")) {
    console.log("Dry run — nothing sent. Re-run with `-- --confirm` to send the payout.");
    return;
  }

  const stamp = `${Date.now().toString(36)}`;
  const contact = await createContact({
    name: process.env.TEST_PAYOUT_NAME!.trim(),
    email: process.env.TEST_PAYOUT_EMAIL!.trim(),
    phone: process.env.TEST_PAYOUT_PHONE,
    referenceId: `test-contact-${stamp}`,
  });

  console.log(`Contact:      ${contact.id}`);

  const fundAccount = await createFundAccount({
    contactId: contact.id,
    accountHolderName: process.env.TEST_PAYOUT_NAME!.trim(),
    ifscCode: process.env.TEST_PAYOUT_IFSC!.trim().toUpperCase(),
    accountNumber: account,
  });

  console.log(`Fund account: ${fundAccount.id}`);

  const referenceId = `test-payout-${stamp}`;
  let payout = await createPayout({
    fundAccountId: fundAccount.id,
    amountInRupees: amount,
    referenceId,
    idempotencyKey: referenceId,
    notes: { purpose: "learniee-test-payout" },
  });

  console.log(`Payout:       ${payout.id} (${payout.status})`);

  for (let i = 0; i < 12 && !FINAL.has(payout.status.toLowerCase()); i++) {
    await sleep(5000);
    payout = await fetchPayout(payout.id);
    console.log(`  status: ${payout.status}`);
  }

  if (payout.status.toLowerCase() === "processed") {
    console.log(`Done — processed. UTR: ${payout.utr ?? "n/a"}`);
  } else if (FINAL.has(payout.status.toLowerCase())) {
    console.error(`Payout ended as ${payout.status}: ${describePayoutFailure(payout)}`);
    process.exit(1);
  } else {
    console.log(
      `Still ${payout.status} after 60 s (normal for queued/pending). Check the RazorpayX dashboard; ` +
        "the webhook delivery log should show a 200 for payout events.",
    );
  }
}

main().catch((error) => {
  if (error instanceof RazorpayXError) {
    console.error(`RazorpayX error${error.status ? ` (HTTP ${error.status})` : ""}: ${error.message}`);
  } else {
    console.error(error);
  }
  process.exit(1);
});
