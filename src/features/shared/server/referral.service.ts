import "server-only";

import { Prisma, ReferralStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { creditWallet } from "@/features/shared/server/wallet.service";

/**
 * Refer & Earn — see the `Referral` model's doc-comment in
 * `schema.prisma` for the full picture. Three moving parts:
 *
 *  1. `getOrCreateReferralCode()` — every Parent gets a shareable
 *     code, lazily generated the first time they open
 *     `/parent/referral` (same lazy-creation pattern as
 *     `DemoCoupon`/`Wallet`).
 *  2. `linkReferralSignup()` — called from
 *     `/api/onboarding/parent-info` when a *new* Parent's Step 1 form
 *     includes a code. Just links referrer <-> referee, PENDING —
 *     pays out nothing by itself.
 *  3. `processReferralRewardForNewEnrollment()` — called from
 *     `enrollment.service.ts` right after a new (payment-confirmed)
 *     Enrollment is created. Only pays out if this is the referee's
 *     *first* Enrollment ever. Credits the referrer's Wallet
 *     (`creditWallet()`), never the referee's — the referee gets
 *     nothing from using a code beyond whatever marketing promotes
 *     separately.
 */

export class ReferralError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const DEFAULT_REWARD_AMOUNT = 500;

// Excludes visually ambiguous characters (0/O, 1/I) so a code is easy
// to read aloud or retype from a screenshot.
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomSuffix(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

function codeBaseFromName(firstName: string | null | undefined): string {
  const cleaned = (firstName ?? "").replace(/[^a-zA-Z]/g, "").toUpperCase();
  return (cleaned || "LEARN").slice(0, 6);
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/**
 * Returns this Parent's own shareable referral code, generating one
 * on first call. Retries on the rare collision (unique constraint)
 * with a longer random suffix each time.
 */
export async function getOrCreateReferralCode(parentId: string): Promise<string> {
  const parent = await prisma.parentProfile.findUnique({
    where: { id: parentId },
    select: { firstName: true, referralCode: true },
  });

  if (!parent) {
    throw new ReferralError("Parent not found.", 404);
  }

  if (parent.referralCode) {
    return parent.referralCode;
  }

  const base = codeBaseFromName(parent.firstName);

  for (let attempt = 0; attempt < 8; attempt++) {
    const suffixLength = attempt < 4 ? 4 : 6;
    const code = `${base}${randomSuffix(suffixLength)}`;

    try {
      const updated = await prisma.parentProfile.update({
        where: { id: parentId },
        data: { referralCode: code },
        select: { referralCode: true },
      });

      return updated.referralCode as string;
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        continue;
      }
      throw err;
    }
  }

  throw new ReferralError("Couldn't generate a unique referral code — please try again.", 500);
}

/**
 * Links a brand-new Parent to whoever referred them, PENDING until a
 * real reward-triggering Enrollment happens. Deliberately silent
 * (returns `null`, never throws) on a blank/invalid/self-referral
 * code — onboarding must never fail just because of a typo'd
 * referral code.
 */
export async function linkReferralSignup(input: { refereeParentId: string; code?: string | null }) {
  const code = input.code?.trim().toUpperCase();

  if (!code) {
    return null;
  }

  const already = await prisma.referral.findUnique({
    where: { refereeParentId: input.refereeParentId },
  });

  if (already) {
    // Already linked (e.g. Step 1 re-submitted) — no-op, not an error.
    return already;
  }

  const referrer = await prisma.parentProfile.findUnique({
    where: { referralCode: code },
    select: { id: true },
  });

  if (!referrer || referrer.id === input.refereeParentId) {
    // Invalid code, or someone trying to refer themselves — ignore.
    return null;
  }

  try {
    return await prisma.referral.create({
      data: {
        referrerParentId: referrer.id,
        refereeParentId: input.refereeParentId,
        code,
        rewardAmount: DEFAULT_REWARD_AMOUNT,
      },
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      // Race: two concurrent onboarding submits. Whichever won,
      // fetch and return it rather than erroring.
      return prisma.referral.findUnique({ where: { refereeParentId: input.refereeParentId } });
    }
    throw err;
  }
}

/**
 * Called right after a new Enrollment row is created (i.e. payment
 * already confirmed — `verifyEnrollmentPayment()` /
 * `reconcileEnrollmentFromWebhook()`). Pays the referrer's Wallet
 * only if:
 *   - this Parent was referred (a PENDING Referral exists for them), and
 *   - this is their first Enrollment ever.
 * Callers should wrap this in try/catch — a referral-processing
 * failure must never block or roll back the Enrollment/payment
 * response itself.
 */
export async function processReferralRewardForNewEnrollment(
  parentId: string,
  enrollmentId: string,
) {
  const referral = await prisma.referral.findUnique({
    where: { refereeParentId: parentId },
  });

  if (!referral || referral.status !== ReferralStatus.PENDING) {
    return;
  }

  const enrollmentCount = await prisma.enrollment.count({ where: { parentId } });

  if (enrollmentCount !== 1) {
    // Not their first Enrollment — reward already resolved (or never
    // will be) the first time around.
    return;
  }

  await creditWallet({
    parentId: referral.referrerParentId,
    amount: Number(referral.rewardAmount),
    reason: "Referral reward — your referral completed their first enrollment.",
    referenceType: "referral",
    referenceId: referral.id,
  });

  await prisma.referral.update({
    where: { id: referral.id },
    data: {
      status: ReferralStatus.REWARDED,
      enrollmentId,
      rewardedAt: new Date(),
    },
  });
}

/** Everything the Referral page needs: own code, referrals made, total earned so far. */
export async function getReferralSummaryForParent(parentId: string) {
  const code = await getOrCreateReferralCode(parentId);

  const referrals = await prisma.referral.findMany({
    where: { referrerParentId: parentId },
    include: {
      referee: {
        select: { firstName: true, lastName: true, visibleName: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalEarned = referrals
    .filter((r) => r.status === ReferralStatus.REWARDED)
    .reduce((sum, r) => sum + Number(r.rewardAmount), 0);

  const pendingCount = referrals.filter((r) => r.status === ReferralStatus.PENDING).length;

  return { code, referrals, totalEarned, pendingCount, rewardAmount: DEFAULT_REWARD_AMOUNT };
}
