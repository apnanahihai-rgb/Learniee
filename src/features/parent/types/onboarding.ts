export interface Step1FormData {
  visibleName: string;
  tuitionType: string;
  nationality: string;
  nriOrIndian: string;
  address: string;
  city: string;
  country: string;
  pincode: string;
  currency: string;
  timezone: string;
  whatsappNumber: string;
  relationToStudent: string;
}

export const emptyStep1FormData: Step1FormData = {
  visibleName: "",
  tuitionType: "",
  nationality: "",
  nriOrIndian: "",
  address: "",
  city: "",
  country: "",
  pincode: "",
  currency: "",
  timezone: "",
  whatsappNumber: "",
  relationToStudent: "",
};

export interface Step2FormData {
  firstName: string;
  lastName: string;
  visibleName: string;
  gender: string;
  age: string;
  standard: string;
  board: string;
  currentSchoolName: string;
  learningDifficulties: string;
}

export const emptyStep2FormData: Step2FormData = {
  firstName: "",
  lastName: "",
  visibleName: "",
  gender: "",
  age: "",
  standard: "",
  board: "",
  currentSchoolName: "",
  learningDifficulties: "",
};

export interface Step3FormData {
  childStatus: string;
  onlineTuition: string;
  modeOfCommunication: string;
  childInterest: string;
  favoriteSubject: string;
  weakSubject: string;
  preferredLanguage: string;
  howDidYouHear: string;
}

export const emptyStep3FormData: Step3FormData = {
  childStatus: "",
  onlineTuition: "",
  modeOfCommunication: "",
  childInterest: "",
  favoriteSubject: "",
  weakSubject: "",
  preferredLanguage: "",
  howDidYouHear: "",
};
