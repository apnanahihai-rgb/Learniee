import { prisma } from "@/lib/prisma";

export interface Step2FileData {
  s3Key: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}

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

  /*
   * Optional uploaded files.
   *
   * Step 2 can be saved without uploading files,
   * therefore these are optional.
   */
  certifications?: Step2FileData[];
  awards?: Step2FileData[];
}

/**
 * Shapes the raw form input into the Prisma data object shared by
 * both create and update.
 */
function buildProfessionalInfoData(input: Step2FormInput) {
  return {
    referredBy: input.referredBy || null,

    qualifications:
      input.qualifications || null,

    overallExperience:
      input.overallExperience || null,

    comfortableLanguage:
      input.comfortableLanguage || null,

    schoolsTaught:
      input.schoolsTaught || null,

    workingInSchool:
      Boolean(input.workingInSchool),

    schoolName:
      input.workingInSchool
        ? input.schoolName || null
        : null,

    workingInAcademy:
      Boolean(input.workingInAcademy),

    academyName:
      input.workingInAcademy
        ? input.academyName || null
        : null,

    homeTuitionArea:
      input.homeTuitionArea || null,

    studentsTaught:
      input.studentsTaught || null,

    canTakeHomeTuition:
      input.canTakeHomeTuition || null,

    hoursPerDay:
      input.hoursPerDay || null,

    haveOwnNotes:
      input.haveOwnNotes || null,

    canMakePresentations:
      input.canMakePresentations || null,

    provideHomework:
      input.provideHomework || null,

    conductPTM:
      input.conductPTM || null,

    hasLaptop:
      Boolean(input.hasLaptop),

    hasPenTab:
      Boolean(input.hasPenTab),

    proficientInEnglish:
      Boolean(input.proficientInEnglish),

    additionalInfo:
      input.additionalInfo || null,

    facebook:
      input.facebook || null,

    linkedin:
      input.linkedin || null,

    instagram:
      input.instagram || null,

    youtube:
      input.youtube || null,

    notWithOtherAcademy:
      Boolean(input.notWithOtherAcademy),
  };
}

/**
 * Loads a teacher along with:
 *
 * 1. Step 2 professional information
 * 2. Existing certification files
 * 3. Existing award files
 */
export async function getTeacherWithProfessionalInfo(
  cognitoSub: string,
) {
  return prisma.teacher.findUnique({
    where: {
      cognitoId: cognitoSub,
    },

    include: {
      professionalInfo: true,

      files: {
        where: {
          type: {
            in: [
              "CERTIFICATION",
              "AWARD",
            ],
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

/**
 * Saves Step 2 professional information and uploaded files.
 */
export async function saveStep2FormData(
  teacherId: string,
  input: Step2FormInput,
) {
  const data =
    buildProfessionalInfoData(input);

  /*
   * ------------------------------------------------------
   * 1. Save professional information
   * ------------------------------------------------------
   */

  const professionalInfo =
    await prisma.teacherProfessional.upsert({
      where: {
        teacherId,
      },

      update: data,

      create: {
        teacherId,
        ...data,
      },
    });

  /*
   * ------------------------------------------------------
   * 2. Update Teacher onboarding status
   * ------------------------------------------------------
   */

  await prisma.teacher.update({
    where: {
      id: teacherId,
    },

    data: {
      currentStep: 2,
      onboardingStatus: "IN_PROGRESS",
    },
  });

  /*
   * ------------------------------------------------------
   * 3. Save certifications
   * ------------------------------------------------------
   *
   * Each uploaded certification gets its own TeacherFile
   * record.
   *
   * Existing certification files are NOT deleted.
   * This allows teachers to upload multiple certifications.
   */

  if (
    input.certifications &&
    input.certifications.length > 0
  ) {
    await prisma.teacherFile.createMany({
      data: input.certifications.map(
        (file) => ({
          teacherId,

          type: "CERTIFICATION" as const,

          s3Key: file.s3Key,

          originalFileName:
            file.originalFileName,

          mimeType:
            file.mimeType,

          fileSize:
            file.fileSize,
        }),
      ),
    });
  }

  /*
   * ------------------------------------------------------
   * 4. Save awards
   * ------------------------------------------------------
   */

  if (
    input.awards &&
    input.awards.length > 0
  ) {
    await prisma.teacherFile.createMany({
      data: input.awards.map(
        (file) => ({
          teacherId,

          type: "AWARD" as const,

          s3Key: file.s3Key,

          originalFileName:
            file.originalFileName,

          mimeType:
            file.mimeType,

          fileSize:
            file.fileSize,
        }),
      ),
    });
  }

  return professionalInfo;
}