export type DocumentKey = "dobProof" | "addressProof" | "qualificationProof";

export interface DocumentSlot {
  key: DocumentKey;
  label: string;
}

export const DOCUMENT_SLOTS: DocumentSlot[] = [
  { key: "dobProof", label: "Date of Birth Proof" },
  { key: "addressProof", label: "Address Proof" },
  { key: "qualificationProof", label: "Qualification / Course Certification" },
];

export const STEP3_ACCEPTED_TYPES = ["image/png", "image/jpeg", "application/pdf"];
export const STEP3_MAX_FILE_SIZE_MB = 50;
