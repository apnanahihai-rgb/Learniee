export interface PhoneCountryCode {
  /** Dial code with the leading plus, e.g. "+91". */
  code: string;
  label: string;
  /** Flag emoji shown in the compact picker. */
  flag: string;
}

export const DEFAULT_PHONE_COUNTRY_CODE = "+91";

export const PHONE_COUNTRY_CODES: PhoneCountryCode[] = [
  { code: "+91", label: "India", flag: "🇮🇳" },
  { code: "+1", label: "United States / Canada", flag: "🇺🇸" },
  { code: "+44", label: "United Kingdom", flag: "🇬🇧" },
  { code: "+971", label: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+966", label: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+974", label: "Qatar", flag: "🇶🇦" },
  { code: "+965", label: "Kuwait", flag: "🇰🇼" },
  { code: "+968", label: "Oman", flag: "🇴🇲" },
  { code: "+973", label: "Bahrain", flag: "🇧🇭" },
  { code: "+65", label: "Singapore", flag: "🇸🇬" },
  { code: "+60", label: "Malaysia", flag: "🇲🇾" },
  { code: "+61", label: "Australia", flag: "🇦🇺" },
  { code: "+64", label: "New Zealand", flag: "🇳🇿" },
  { code: "+49", label: "Germany", flag: "🇩🇪" },
  { code: "+33", label: "France", flag: "🇫🇷" },
  { code: "+39", label: "Italy", flag: "🇮🇹" },
  { code: "+34", label: "Spain", flag: "🇪🇸" },
  { code: "+31", label: "Netherlands", flag: "🇳🇱" },
  { code: "+41", label: "Switzerland", flag: "🇨🇭" },
  { code: "+46", label: "Sweden", flag: "🇸🇪" },
  { code: "+353", label: "Ireland", flag: "🇮🇪" },
  { code: "+81", label: "Japan", flag: "🇯🇵" },
  { code: "+82", label: "South Korea", flag: "🇰🇷" },
  { code: "+86", label: "China", flag: "🇨🇳" },
  { code: "+852", label: "Hong Kong", flag: "🇭🇰" },
  { code: "+66", label: "Thailand", flag: "🇹🇭" },
  { code: "+62", label: "Indonesia", flag: "🇮🇩" },
  { code: "+63", label: "Philippines", flag: "🇵🇭" },
  { code: "+94", label: "Sri Lanka", flag: "🇱🇰" },
  { code: "+977", label: "Nepal", flag: "🇳🇵" },
  { code: "+880", label: "Bangladesh", flag: "🇧🇩" },
  { code: "+92", label: "Pakistan", flag: "🇵🇰" },
  { code: "+27", label: "South Africa", flag: "🇿🇦" },
  { code: "+234", label: "Nigeria", flag: "🇳🇬" },
  { code: "+254", label: "Kenya", flag: "🇰🇪" },
  { code: "+20", label: "Egypt", flag: "🇪🇬" },
  { code: "+55", label: "Brazil", flag: "🇧🇷" },
  { code: "+52", label: "Mexico", flag: "🇲🇽" },
];

/** Joins a dial code and a local number into E.164 ("+91" + "98765 43210" -> "+919876543210"). */
export function buildE164(code: string, localNumber: string): string {
  return `${code}${localNumber.replace(/\D/g, "")}`;
}
