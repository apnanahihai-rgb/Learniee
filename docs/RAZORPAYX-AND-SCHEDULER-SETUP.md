# RazorpayX payouts + Docker scheduler — setup

## 1. Scheduler (Docker host)

The `scheduler` service in `docker-compose.yml` calls the cron routes with `Authorization: Bearer $CRON_SECRET` (all times UTC):

| Route | When |
|---|---|
| `resolve-sessions` | every 5 min |
| `session-reminders` | every 5 min |
| `payout-reconcile` | every 15 min |
| `enrollment-auto-lapse` | daily 03:00 |
| `due-date-reminders` | daily 03:30 |

Add to the `.env` beside `docker-compose.yml` (one value; the app and scheduler both read it):

```
CRON_SECRET=<long random string>
```

Then: `docker compose up -d --build scheduler app` and watch `docker compose logs -f scheduler` (one line per call, `-> 200` = OK).

If Vercel is also still live, both will call the routes — safe (idempotent), just redundant.

## 2. RazorpayX activation (dashboard)

1. Activate RazorpayX (current account + KYC) and note the **RazorpayX account number**.
2. Create RazorpayX **API keys** (separate from the Payments keys).
3. **Webhooks** (Developer Controls): URL `https://app.learniee.in/api/webhooks/razorpayx`, events `payout.processed`, `payout.reversed`, `payout.rejected`, `payout.failed`, `payout.updated` (optionally `payout.initiated`, `payout.queued`, `payout.pending`), and a secret of your choice.
4. Fund the RazorpayX account (the code queues payouts on low balance, but nothing leaves until funded).

## 3. Env vars (`.env` on the server)

```
RAZORPAYX_ENABLED=false        # keep false until the test payout works
RAZORPAYX_KEY_ID=
RAZORPAYX_KEY_SECRET=
RAZORPAYX_ACCOUNT_NUMBER=
RAZORPAYX_PAYOUT_MODE=IMPS     # IMPS | NEFT | RTGS | UPI (IMPS auto-switches to NEFT above ₹5,00,000)
RAZORPAYX_WEBHOOK_SECRET=      # same secret as in the dashboard webhook
```

Restart the app after changing them: `docker compose up -d app`.

## 4. Small test payout

Uses real RazorpayX calls; does not touch the DB or any ledger row. Add temporarily to a local `.env` (or export in the shell):

```
TEST_PAYOUT_NAME=
TEST_PAYOUT_ACCOUNT=
TEST_PAYOUT_IFSC=
TEST_PAYOUT_EMAIL=
TEST_PAYOUT_PHONE=      # optional
TEST_PAYOUT_AMOUNT=1    # ₹1–10
```

```
npm run payout:test               # config check only
npm run payout:test -- --confirm  # sends the payout and polls its status
```

Pay to your own bank account. Expect the webhook log in the RazorpayX dashboard to show 200 for the payout events (the app ignores payouts it did not create, so it will answer "UNKNOWN_RECORD" harmlessly).

## 5. Go live

Set `RAZORPAYX_ENABLED=true`, restart the app, then run one real Accounts mass-pay with a single small ledger row first. Remove the `TEST_PAYOUT_*` vars afterwards.
