export interface PhoneCountryCode {
  /** Dial code with the leading plus, e.g. "+91". */
  code: string;
  label: string;
}

export const DEFAULT_PHONE_COUNTRY_CODE = "+91";

export const PHONE_COUNTRY_CODES: PhoneCountryCode[] = [
  { code: "+91", label: "India" },
  { code: "+1", label: "United States / Canada" },
  { code: "+44", label: "United Kingdom" },
  { code: "+971", label: "United Arab Emirates" },
  { code: "+966", label: "Saudi Arabia" },
  { code: "+974", label: "Qatar" },
  { code: "+965", label: "Kuwait" },
  { code: "+968", label: "Oman" },
  { code: "+973", label: "Bahrain" },
  { code: "+65", label: "Singapore" },
  { code: "+60", label: "Malaysia" },
  { code: "+61", label: "Australia" },
  { code: "+64", label: "New Zealand" },
  { code: "+49", label: "Germany" },
  { code: "+33", label: "France" },
  { code: "+39", label: "Italy" },
  { code: "+34", label: "Spain" },
  { code: "+31", label: "Netherlands" },
  { code: "+41", label: "Switzerland" },
  { code: "+46", label: "Sweden" },
  { code: "+353", label: "Ireland" },
  { code: "+81", label: "Japan" },
  { code: "+82", label: "South Korea" },
  { code: "+86", label: "China" },
  { code: "+852", label: "Hong Kong" },
  { code: "+66", label: "Thailand" },
  { code: "+62", label: "Indonesia" },
  { code: "+63", label: "Philippines" },
  { code: "+94", label: "Sri Lanka" },
  { code: "+977", label: "Nepal" },
  { code: "+880", label: "Bangladesh" },
  { code: "+92", label: "Pakistan" },
  { code: "+27", label: "South Africa" },
  { code: "+234", label: "Nigeria" },
  { code: "+254", label: "Kenya" },
  { code: "+20", label: "Egypt" },
  { code: "+55", label: "Brazil" },
  { code: "+52", label: "Mexico" },
];

/** Joins a dial code and a local number into E.164 ("+91" + "98765 43210" -> "+919876543210"). */
export function buildE164(code: string, localNumber: string): string {
  return `${code}${localNumber.replace(/\D/g, "")}`;
}
