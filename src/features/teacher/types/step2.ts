export interface Step2FormData {
  referredBy: string;
  qualifications: string;
  overallExperience: string;
  comfortableLanguage: string;
  schoolsTaught: string;

  workingInSchool: boolean;
  schoolName: string;

  workingInAcademy: boolean;
  academyName: string;

  homeTuitionArea: string;
  studentsTaught: string;
  canTakeHomeTuition: string;
  hoursPerDay: string;

  haveOwnNotes: string;
  canMakePresentations: string;
  provideHomework: string;
  conductPTM: string;

  hasLaptop: boolean;
  hasPenTab: boolean;
  proficientInEnglish: boolean;

  additionalInfo: string;

  facebook: string;
  linkedin: string;
  instagram: string;
  youtube: string;

  notWithOtherAcademy: boolean;
}

export const initialStep2FormData: Step2FormData = {
  referredBy: "",
  qualifications: "",
  overallExperience: "",
  comfortableLanguage: "",
  schoolsTaught: "",

  workingInSchool: false,
  schoolName: "",

  workingInAcademy: false,
  academyName: "",

  homeTuitionArea: "",
  studentsTaught: "",
  canTakeHomeTuition: "",
  hoursPerDay: "",

  haveOwnNotes: "",
  canMakePresentations: "",
  provideHomework: "",
  conductPTM: "",

  hasLaptop: false,
  hasPenTab: false,
  proficientInEnglish: false,

  additionalInfo: "",

  facebook: "",
  linkedin: "",
  instagram: "",
  youtube: "",

  notWithOtherAcademy: false,
};

/** Type for the change handler shared by every Step 2 section component. */
export type Step2ChangeHandler = (
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
) => void;
