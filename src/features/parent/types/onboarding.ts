/**
 * Parent onboarding is now a single quick step (name, WhatsApp, Indian/NRI,
 * optional referral code). Everything else — child, location, preferences —
 * is collected gradually from the dashboard (ProfileCompletionCard).
 */
export interface Step1FormData {
  visibleName: string;
  nriOrIndian: string;
  city: string;
  whatsappNumber: string;
  /** Optional — another Parent's shareable code (Refer & Earn). Not a
   * ParentProfile column; handled specially by
   * /api/onboarding/parent-info, see referral.service.ts. */
  referredByCode: string;
}

export const emptyStep1FormData: Step1FormData = {
  visibleName: "",
  nriOrIndian: "",
  city: "",
  whatsappNumber: "",
  referredByCode: "",
};
