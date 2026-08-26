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

export interface Step1FileData {
  s3Key: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}

interface Step1FileInput {
  profilePhoto?: Step1FileData;
  introVideo?: Step1FileData;
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
 * Loads Step 1 information and existing Step 1 files.
 */
export async function getStep1FormData(
  cognitoSub: string,
  cognito: CognitoProfile
) {
  const teacher = await prisma.teacher.findUnique({
    where: {
      cognitoId: cognitoSub,
    },

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

      files: {
        where: {
          type: {
            in: [
              "PROFILE_PHOTO",
              "INTRO_VIDEO",
            ],
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!teacher) {
    return {
      exists: false as const,

      teacherId: null,

      formData: {
        ...cognito,
        ...emptyEditableFields,
      },

      currentStep: 0,

      onboardingStatus: "NOT_STARTED",

      approvalStatus: null,

      files: {
        profilePhoto: null,
        introVideo: null,
      },
    };
  }

  const profilePhoto =
    teacher.files.find(
      (file) =>
        file.type === "PROFILE_PHOTO"
    ) ?? null;

  const introVideo =
    teacher.files.find(
      (file) =>
        file.type === "INTRO_VIDEO"
    ) ?? null;

  return {
    exists: true as const,

    teacherId: teacher.id,

    formData: {
      ...cognito,

      visibleName:
        teacher.visibleName || "",

      dobDay:
        teacher.dobDay !== null
          ? String(teacher.dobDay)
          : "",

      dobMonth:
        teacher.dobMonth || "",

      dobYear:
        teacher.dobYear !== null
          ? String(teacher.dobYear)
          : "",

      gender:
        teacher.gender || "",

      nationality:
        teacher.nationality || "",

      address:
        teacher.address || "",

      city:
        teacher.city || "",

      country:
        teacher.country || "",

      pincode:
        teacher.pincode || "",

      phone:
        teacher.phone || "",

      whatsapp:
        teacher.whatsapp || "",

      aboutMe:
        teacher.aboutMe || "",

      criminalCase:
        teacher.criminalCase || "",
    },

    currentStep:
      teacher.currentStep,

    onboardingStatus:
      teacher.onboardingStatus,

    approvalStatus:
      teacher.approvalStatus,

    files: {
      profilePhoto,
      introVideo,
    },
  };
}

/**
 * Creates or updates Step 1 personal information.
 *
 * Optional file information is also saved into TeacherFile.
 */
export async function saveStep1FormData(
  cognitoSub: string,
  cognito: CognitoProfile,

  input: Omit<
    Step1FormData,
    "firstName" | "lastName" | "email"
  > &
    Step1FileInput
) {
  const editableData = {
    visibleName:
      input.visibleName,

    dobDay:
      input.dobDay
        ? Number(input.dobDay)
        : null,

    dobMonth:
      input.dobMonth || null,

    dobYear:
      input.dobYear
        ? Number(input.dobYear)
        : null,

    gender:
      input.gender,

    nationality:
      input.nationality,

    address:
      input.address,

    city:
      input.city,

    country:
      input.country,

    pincode:
      input.pincode,

    phone:
      input.phone,

    whatsapp:
      input.whatsapp,

    aboutMe:
      input.aboutMe,

    criminalCase:
      input.criminalCase,
  };

  /*
   * Create or update Teacher.
   */
  const teacher =
    await prisma.teacher.upsert({
      where: {
        cognitoId: cognitoSub,
      },

      update: {
        ...cognito,
        ...editableData,

        currentStep: 2,

        onboardingStatus:
          "IN_PROGRESS",
      },

      create: {
        cognitoId:
          cognitoSub,

        ...cognito,
        ...editableData,

        currentStep: 2,

        onboardingStatus:
          "IN_PROGRESS",

        approvalStatus:
          "PENDING",
      },
    });

  /*
   * Save PROFILE_PHOTO.
   *
   * We intentionally find the existing record instead
   * of creating duplicates every time the teacher presses Next.
   */
  if (input.profilePhoto) {
    const existing =
      await prisma.teacherFile.findFirst({
        where: {
          teacherId: teacher.id,
          type: "PROFILE_PHOTO",
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    if (existing) {
      await prisma.teacherFile.update({
        where: {
          id: existing.id,
        },

        data: {
          s3Key:
            input.profilePhoto.s3Key,

          originalFileName:
            input.profilePhoto.originalFileName,

          mimeType:
            input.profilePhoto.mimeType,

          fileSize:
            input.profilePhoto.fileSize,
        },
      });
    } else {
      await prisma.teacherFile.create({
        data: {
          teacherId:
            teacher.id,

          type:
            "PROFILE_PHOTO",

          s3Key:
            input.profilePhoto.s3Key,

          originalFileName:
            input.profilePhoto.originalFileName,

          mimeType:
            input.profilePhoto.mimeType,

          fileSize:
            input.profilePhoto.fileSize,
        },
      });
    }
  }

  /*
   * Save INTRO_VIDEO.
   */
  if (input.introVideo) {
    const existing =
      await prisma.teacherFile.findFirst({
        where: {
          teacherId: teacher.id,
          type: "INTRO_VIDEO",
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    if (existing) {
      await prisma.teacherFile.update({
        where: {
          id: existing.id,
        },

        data: {
          s3Key:
            input.introVideo.s3Key,

          originalFileName:
            input.introVideo.originalFileName,

          mimeType:
            input.introVideo.mimeType,

          fileSize:
            input.introVideo.fileSize,
        },
      });
    } else {
      await prisma.teacherFile.create({
        data: {
          teacherId:
            teacher.id,

          type:
            "INTRO_VIDEO",

          s3Key:
            input.introVideo.s3Key,

          originalFileName:
            input.introVideo.originalFileName,

          mimeType:
            input.introVideo.mimeType,

          fileSize:
            input.introVideo.fileSize,
        },
      });
    }
  }

  /*
   * Return Teacher.
   */
  return teacher;
}