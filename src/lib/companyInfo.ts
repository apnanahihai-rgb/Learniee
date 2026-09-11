/**
 * Billing-entity details shown on the printable invoice (Sep 11,
 * 2026). Pulled from `NEXT_PUBLIC_*` env vars (not secrets — this is
 * the same info that would appear on any printed receipt) with safe
 * defaults so the invoice still renders correctly before these are
 * set. Update the env vars once the registered business
 * name/address/GSTIN are finalised — no code change needed.
 */
export const COMPANY_INFO = {
  legalName: process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME || "Learniee",
  tagline: process.env.NEXT_PUBLIC_COMPANY_TAGLINE || "Online Tuition Platform",
  addressLines: (
    process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "Navi Mumbai, Maharashtra, India"
  )
    .split("|")
    .map((line) => line.trim())
    .filter(Boolean),
  email: process.env.NEXT_PUBLIC_COMPANY_SUPPORT_EMAIL || "support@learniee.com",
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || "",
  website: process.env.NEXT_PUBLIC_COMPANY_WEBSITE || "www.learniee.com",
  /** Optional — leave the env var unset until GST registration is confirmed; omitted from the invoice when blank. */
  gstin: process.env.NEXT_PUBLIC_COMPANY_GSTIN || "",
};
