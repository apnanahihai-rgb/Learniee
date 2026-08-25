import { prisma } from "@/lib/prisma";

export interface Step1FormData {
  firstName: string;
  lastName: string;
  email: string;

  visibleName: string;

  dobDay: string;
  dobMonth: string;
  dobYear: string;

  gender: string;
  nationality: string;

  address: string;
  city: string;
  country: string;
  pincode: string;

  phone: string;
  whatsapp: string;

  aboutMe: string;
  criminalCase: string;
}

interface CognitoProfile {
  firstName: string;
  lastName: string;
  email: string;
}

const emptyEditableFields = {
  visibleName: "",

  dobDay: "",
  dobMonth: "",
  dobYear: "",

  gender: "",
  nationality: "",

  address: "",
  city: "",
  country: "",
  pincode: "",

  phone: "",
  whatsapp: "",

  aboutMe: "",
  criminalCase: "",
};

/**
 * Loads Step 1 form state for a teacher, if one exists.
 *
 * firstName/lastName/email always come from Cognito (the source of
 * truth for identity fields); everything else comes from RDS.
 */
export async function getStep1FormData(cognitoSub: string, cognito: CognitoProfile) {
  const teacher = await prisma.teacher.findUnique({
    where: { cognitoId: cognitoSub },
    select: {
      id: true,

      visibleName: true,

      dobDay: true,
      dobMonth: true,
      dobYear: true,

      gender: true,
      nationality: true,

      address: true,
      city: true,
      country: true,
      pincode: true,

      phone: true,
      whatsapp: true,

      aboutMe: true,
      criminalCase: true,

      currentStep: true,
      onboardingStatus: true,
      approvalStatus: true,
    },
  });

  if (!teacher) {
    return {
      exists: false as const,
      teacherId: null,
      formData: { ...cognito, ...emptyEditableFields },
      currentStep: 0,
      onboardingStatus: "NOT_STARTED",
      approvalStatus: null,
    };
  }

  return {
    exists: true as const,
    teacherId: teacher.id,
    formData: {
      ...cognito,

      visibleName: teacher.visibleName || "",

      dobDay: teacher.dobDay !== null ? String(teacher.dobDay) : "",
      dobMonth: teacher.dobMonth || "",
      dobYear: teacher.dobYear !== null ? String(teacher.dobYear) : "",

      gender: teacher.gender || "",
      nationality: teacher.nationality || "",

      address: teacher.address || "",
      city: teacher.city || "",
      country: teacher.country || "",
      pincode: teacher.pincode || "",

      phone: teacher.phone || "",
      whatsapp: teacher.whatsapp || "",

      aboutMe: teacher.aboutMe || "",
      criminalCase: teacher.criminalCase || "",
    },
    currentStep: teacher.currentStep,
    onboardingStatus: teacher.onboardingStatus,
    approvalStatus: teacher.approvalStatus,
  };
}

/**
 * Creates or updates a teacher's Step 1 (personal info) data.
 * Identity fields (email/firstName/lastName) always come from Cognito,
 * never from the request body.
 */
export async function saveStep1FormData(
  cognitoSub: string,
  cognito: CognitoProfile,
  input: Omit<Step1FormData, "firstName" | "lastName" | "email">,
) {
  const editableData = {
    visibleName: input.visibleName,

    dobDay: input.dobDay ? Number(input.dobDay) : null,
    dobMonth: input.dobMonth || null,
    dobYear: input.dobYear ? Number(input.dobYear) : null,

    gender: input.gender,
    nationality: input.nationality,

    address: input.address,
    city: input.city,
    country: input.country,
    pincode: input.pincode,

    phone: input.phone,
    whatsapp: input.whatsapp,

    aboutMe: input.aboutMe,
    criminalCase: input.criminalCase,
  };

  const existingTeacher = await prisma.teacher.findUnique({
    where: { cognitoId: cognitoSub },
  });

  if (existingTeacher) {
    return prisma.teacher.update({
      where: { cognitoId: cognitoSub },
      data: {
        ...cognito,
        ...editableData,
        currentStep: 2,
        onboardingStatus: "IN_PROGRESS",
      },
    });
  }

  return prisma.teacher.create({
    data: {
      cognitoId: cognitoSub,
      ...cognito,
      ...editableData,
      currentStep: 2,
      onboardingStatus: "IN_PROGRESS",
      approvalStatus: "PENDING",
    },
  });
}
