/**
 * Wallet top-up bounds — pulled into their own file (no server-only
 * imports) so both `wallet.service.ts` (server) and the Parent-side
 * `useWallet` hook (client, for input validation before even
 * hitting the network) can import the same numbers without the
 * client bundle pulling in server-only code like `src/lib/razorpay.ts`.
 *
 * Placeholder assumption, not a confirmed spec — same status as the
 * Enrollment pricing formula in 03-DATA-MODEL.md.
 */
export const WALLET_TOPUP_MIN_AMOUNT = 100;
export const WALLET_TOPUP_MAX_AMOUNT = 25000;
