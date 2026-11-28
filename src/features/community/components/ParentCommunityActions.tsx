"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, LogOut, Plus } from "lucide-react";

import {
  PD_BTN_DNG,
  PD_BTN_DTXT_SM,
  PD_BTN_PRI_SM,
  PD_BTN_SEC,
  PD_BTN_SEC_SM,
  PD_ERR,
} from "@/features/parent/components/courses/pdUi";
import PdDialog from "@/features/shared/components/PdDialog";

import type { MembershipResult } from "../hooks/useParentCommunities";
import type { ParentCommunityRow } from "../types/community";
import { formatPrice } from "../utils/format";

type Target = Pick<ParentCommunityRow, "id" | "title" | "isMember" | "isPaid" | "hasPaid" | "price">;

/**
 * Join / Pay / Open / Leave for one community. Free communities join in one tap.
 * Paid ones show "Pay ₹X & join": paying opens Razorpay and joins automatically.
 * A Parent who paid cannot leave (a refund request is how a paid membership
 * ends); leaving a free community asks first, since its files are no longer
 * reachable afterwards.
 */
export default function ParentCommunityActions({
  community,
  onJoin,
  onLeave,
  onPay,
  showOpen = true,
}: {
  community: Target;
  onJoin: () => Promise<MembershipResult>;
  onLeave: () => Promise<MembershipResult>;
  /** Opens checkout for a paid community; joins automatically once paid. */
  onPay: () => Promise<MembershipResult>;
  /** The card links to the detail page; the detail page itself does not need "Open". */
  showOpen?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  async function run(action: () => Promise<MembershipResult>) {
    setBusy(true);
    setError("");

    const result = await action();

    setBusy(false);

    if (!result.ok) {
      setError(result.error);

      return false;
    }

    return true;
  }

  // Paid, not a member yet. If they already paid (access was lost somehow) they
  // get back in without paying again.
  if (community.isPaid && !community.isMember && !community.hasPaid) {
    return (
      <div className="flex flex-col items-start gap-1">
        <button type="button" disabled={busy} onClick={() => void run(onPay)} className={PD_BTN_PRI_SM}>
          {busy ? "Opening payment…" : `Pay ${formatPrice(community.price)} & join`}
        </button>
        <p className="text-xs text-pd-ink3">GST is added at checkout.</p>
        {error && <p className={PD_ERR}>{error}</p>}
      </div>
    );
  }

  if (!community.isMember) {
    return (
      <div className="flex flex-col items-start gap-1">
        <button type="button" disabled={busy} onClick={() => void run(onJoin)} className={PD_BTN_PRI_SM}>
          <Plus size={14} />
          {busy ? "Joining…" : community.hasPaid ? "Join (already paid)" : "Join for free"}
        </button>
        {error && <p className={PD_ERR}>{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-pd-b50 px-3 py-1 text-[13px] font-semibold text-pd-brand-d">
          <Check size={14} />
          Joined
        </span>
        {showOpen && (
          <Link href={`/parent/community/${community.id}`} className={PD_BTN_SEC_SM}>
            Open
          </Link>
        )}
        {!community.hasPaid && (
          <button type="button" disabled={busy} onClick={() => setConfirmingLeave(true)} className={PD_BTN_DTXT_SM}>
            <LogOut size={14} />
            Leave
          </button>
        )}
      </div>
      {community.hasPaid && (
        <p className="text-xs text-pd-ink3">
          Paid membership. To end it,{" "}
          <Link href="/parent/payments" className="font-semibold text-pd-brand hover:underline">
            request a refund
          </Link>
          .
        </p>
      )}
      {error && <p className={PD_ERR}>{error}</p>}

      {confirmingLeave && (
        <PdDialog
          title="Leave this community?"
          onClose={() => setConfirmingLeave(false)}
          footer={
            <>
              <button type="button" className={PD_BTN_SEC} onClick={() => setConfirmingLeave(false)}>
                Stay
              </button>
              <button
                type="button"
                disabled={busy}
                className={PD_BTN_DNG}
                onClick={async () => {
                  if (await run(onLeave)) setConfirmingLeave(false);
                }}
              >
                {busy ? "Leaving…" : "Leave"}
              </button>
            </>
          }
        >
          <p className="text-pd-ink2">
            You will no longer be able to open or download the files in &ldquo;{community.title}&rdquo;. You can join
            again any time.
          </p>
          {error && <p className={PD_ERR}>{error}</p>}
        </PdDialog>
      )}
    </div>
  );
}
