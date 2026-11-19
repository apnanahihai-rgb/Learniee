/**
 * Ledger statuses that count as "on the way" — earned by the Teacher but not
 * yet in the bank. One list, read by both the Home earnings card (server
 * aggregate) and the Earnings page (client sum), so the two screens agree.
 * Plain strings so it is safe to import from client and server code alike.
 */
export const ON_THE_WAY_PAYOUT_STATUSES = ["PROCESSING", "QUEUED_FOR_PAYMENT", "APPROVED"] as const;

export type OnTheWayPayoutStatus = (typeof ON_THE_WAY_PAYOUT_STATUSES)[number];

export const isOnTheWayStatus = (status: string): status is OnTheWayPayoutStatus =>
  (ON_THE_WAY_PAYOUT_STATUSES as readonly string[]).includes(status);
