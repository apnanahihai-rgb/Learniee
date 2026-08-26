export interface AdminTeacher {
  id: string;
  cognitoId: string;
  email: string;
  firstName: string;
  lastName: string;
  visibleName: string | null;

  dobDay: number | null;
  dobMonth: string | null;
  dobYear: number | null;

  gender: string | null;
  nationality: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  pincode: string | null;
  phone: string | null;
  whatsapp: string | null;
  aboutMe: string | null;
  criminalCase: string | null;

  onboardingComplete: boolean;
  approvalStatus: string;
  createdAt: string;
  updatedAt: string;

  professionalInfo: {
    referredBy: string | null;
    qualifications: string | null;
    overallExperience: string | null;
    comfortableLanguage: string | null;
    schoolsTaught: string | null;

    workingInSchool: boolean;
    schoolName: string | null;

    workingInAcademy: boolean;
    academyName: string | null;

    homeTuitionArea: string | null;
    studentsTaught: string | null;
    canTakeHomeTuition: string | null;
    hoursPerDay: string | null;

    haveOwnNotes: string | null;
    canMakePresentations: string | null;
    provideHomework: string | null;
    conductPTM: string | null;

    hasLaptop: boolean;
    hasPenTab: boolean;
    proficientInEnglish: boolean;

    notWithOtherAcademy: boolean;

    additionalInfo: string | null;

    facebook: string | null;
    linkedin: string | null;
    instagram: string | null;
    youtube: string | null;
  } | null;

  documents: {
    videoIntroKey: string | null;
    photoKey: string | null;
    certificationKey: string | null;
    awardsKey: string | null;
    dobProofKey: string | null;
    addressProofKey: string | null;
    qualificationProofKey: string | null;
    panCardNumber: string | null;

    // Short-lived, viewable URLs generated server-side from the
    // keys above (the S3 bucket is private, so the raw keys on
    // their own aren't openable in the browser).
    videoIntroUrl: string | null;
    photoUrl: string | null;
    certificationUrl: string | null;
    awardsUrl: string | null;
    dobProofUrl: string | null;
    addressProofUrl: string | null;
    qualificationProofUrl: string | null;
  } | null;
}