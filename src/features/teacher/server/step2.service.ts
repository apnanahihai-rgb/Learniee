import { prisma } from "@/lib/prisma";

export interface Step2FormInput {
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

/**
 * Shapes the raw form input into the Prisma data object shared by
 * both create and update (this is the single source of truth for
 * how each field is normalized — avoids the create/update blocks
 * drifting out of sync).
 */
function buildProfessionalInfoData(input: Step2FormInput) {
  return {
    referredBy: input.referredBy || null,
    qualifications: input.qualifications || null,
    overallExperience: input.overallExperience || null,
    comfortableLanguage: input.comfortableLanguage || null,
    schoolsTaught: input.schoolsTaught || null,

    workingInSchool: Boolean(input.workingInSchool),
    schoolName: input.workingInSchool ? input.schoolName || null : null,

    workingInAcademy: Boolean(input.workingInAcademy),
    academyName: input.workingInAcademy ? input.academyName || null : null,

    homeTuitionArea: input.homeTuitionArea || null,
    studentsTaught: input.studentsTaught || null,
    canTakeHomeTuition: input.canTakeHomeTuition || null,
    hoursPerDay: input.hoursPerDay || null,

    haveOwnNotes: input.haveOwnNotes || null,
    canMakePresentations: input.canMakePresentations || null,
    provideHomework: input.provideHomework || null,
    conductPTM: input.conductPTM || null,

    hasLaptop: Boolean(input.hasLaptop),
    hasPenTab: Boolean(input.hasPenTab),
    proficientInEnglish: Boolean(input.proficientInEnglish),

    additionalInfo: input.additionalInfo || null,

    facebook: input.facebook || null,
    linkedin: input.linkedin || null,
    instagram: input.instagram || null,
    youtube: input.youtube || null,

    notWithOtherAcademy: Boolean(input.notWithOtherAcademy),
  };
}

/**
 * Loads a teacher (by Cognito sub) along with their Step 2
 * professional info, if any.
 */
export async function getTeacherWithProfessionalInfo(cognitoSub: string) {
  return prisma.teacher.findUnique({
    where: { cognitoId: cognitoSub },
    include: { professionalInfo: true },
  });
}

/**
 * Saves (creates or updates) a teacher's Step 2 professional info,
 * and marks the teacher's onboarding progress accordingly.
 */
export async function saveStep2FormData(teacherId: string, input: Step2FormInput) {
  const data = buildProfessionalInfoData(input);

  const professionalInfo = await prisma.teacherProfessional.upsert({
    where: { teacherId },
    update: data,
    create: { teacherId, ...data },
  });

  await prisma.teacher.update({
    where: { id: teacherId },
    data: {
      currentStep: 2,
      onboardingStatus: "IN_PROGRESS",
    },
  });

  return professionalInfo;
}
