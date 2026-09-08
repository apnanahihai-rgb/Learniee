import {
  Gift,
  IndianRupee,
  Users,
  GraduationCap,
  CheckCircle2,
  Wallet,
  MessageCircle,
} from "lucide-react";

/**
 * "Referral" sidebar entry — previously a placeholder link with no
 * page behind it (see ParentSidebar.tsx / 01-PROJECT-STATUS.md's
 * sidebar note). Purely informational, mirroring the public
 * marketing page at https://learniee.com/refer-a-parent-and-earn/ —
 * no referral-code generation, tracking, or lead-capture form here
 * by design, just the program details in-app. If a real
 * generate-a-code / track-my-referrals flow gets scoped later, that's
 * a separate feature on top of this page, not a replacement for it.
 *
 * No client-side state/interactivity needed, so this stays a plain
 * server component.
 */

const rewardAmount = "₹500";

const referrerTypes = [
  "A current Learniee parent",
  "A Learniee tutor",
  "A student",
  "A friend, family member, or well-wisher",
];

const refereeTypes = [
  "School students",
  "Competitive exam aspirants",
  "Anyone looking for quality one-on-one or small-group online classes",
];

export default function ParentReferralPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Hero */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-600 bg-violet-100 px-3 py-1 rounded-full mb-3">
          <Gift size={14} />
          Refer &amp; Earn
        </div>
        <h1 className="text-2xl font-bold text-violet-900">
          Share learning. Earn rewards.
        </h1>
        <p className="text-gray-500 mt-2">
          Good education grows through trust and word of mouth. Every
          successful referral you bring to Learniee earns you a real
          reward — there&apos;s no limit on how many people you can refer.
        </p>
      </div>

      {/* Reward callout */}
      <div className="bg-violet-900 text-white rounded-2xl p-6 mb-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
          <IndianRupee size={22} />
        </div>
        <div>
          <p className="text-2xl font-bold">{rewardAmount} per successful referral</p>
          <p className="text-white/70 text-sm mt-0.5">No cap — refer as many people as you like.</p>
        </div>
      </div>

      {/* Who can refer / who can be referred */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users size={18} className="text-violet-600" />
            <h2 className="font-semibold text-gray-800">Who can refer</h2>
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            {referrerTypes.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap size={18} className="text-violet-600" />
            <h2 className="font-semibold text-gray-800">Who can be referred</h2>
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            {refereeTypes.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white border rounded-xl p-5 shadow-sm mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">How it works</h2>

        <ol className="space-y-4">
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
              1
            </span>
            <p className="text-sm text-gray-600">
              You refer someone — a student or family looking for quality
              1-on-1 or small-group online classes.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
              2
            </span>
            <p className="text-sm text-gray-600">
              The referred student enrolls and completes the initial
              enrollment process, per Learniee&apos;s policy — that&apos;s
              when the referral is considered successful.
            </p>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
              3
            </span>
            <p className="text-sm text-gray-600">
              Once confirmed, your {rewardAmount} reward is processed and
              shared with you as per Learniee&apos;s referral policy.
            </p>
          </li>
        </ol>
      </div>

      {/* Payout note */}
      <div className="bg-green-50 border border-green-100 rounded-xl p-5 mb-6 flex gap-3">
        <Wallet size={20} className="text-green-700 flex-shrink-0 mt-0.5" />
        <div>
          <h2 className="font-semibold text-green-800 text-sm">
            How you&apos;ll receive {rewardAmount}
          </h2>
          <p className="text-sm text-green-700/90 mt-1">
            Your referral reward is shared through direct payment or
            adjusted as per Learniee&apos;s referral policy. Exact details
            and timelines are communicated once your referral is verified.
          </p>
        </div>
      </div>

      {/* Contact — link out only, no form */}
      <div className="bg-white border rounded-xl p-5 shadow-sm flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-semibold text-gray-800">Know someone who'd benefit?</h2>
          <p className="text-sm text-gray-500 mt-1">
            Share Learniee with them, or reach out to us directly to refer them.
          </p>
        </div>
        <a
          href="https://wa.me/919833077682"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg whitespace-nowrap"
        >
          <MessageCircle size={16} />
          WhatsApp us
        </a>
      </div>
    </div>
  );
}
