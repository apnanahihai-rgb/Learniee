-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "cognitoId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "visibleName" TEXT,
    "dobDay" INTEGER,
    "dobMonth" TEXT,
    "dobYear" INTEGER,
    "gender" TEXT,
    "nationality" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "pincode" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "aboutMe" TEXT,
    "criminalCase" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherProfessional" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "referredBy" TEXT,
    "qualifications" TEXT,
    "overallExperience" TEXT,
    "comfortableLanguage" TEXT,
    "schoolsTaught" TEXT,
    "workingInSchool" BOOLEAN NOT NULL DEFAULT false,
    "schoolName" TEXT,
    "workingInAcademy" BOOLEAN NOT NULL DEFAULT false,
    "academyName" TEXT,
    "homeTuitionArea" TEXT,
    "studentsTaught" TEXT,
    "canTakeHomeTuition" TEXT,
    "hoursPerDay" TEXT,
    "haveOwnNotes" TEXT,
    "canMakePresentations" TEXT,
    "provideHomework" TEXT,
    "conductPTM" TEXT,
    "hasLaptop" BOOLEAN NOT NULL DEFAULT false,
    "hasPenTab" BOOLEAN NOT NULL DEFAULT false,
    "proficientInEnglish" BOOLEAN NOT NULL DEFAULT false,
    "notWithOtherAcademy" BOOLEAN NOT NULL DEFAULT false,
    "additionalInfo" TEXT,
    "facebook" TEXT,
    "linkedin" TEXT,
    "instagram" TEXT,
    "youtube" TEXT,

    CONSTRAINT "TeacherProfessional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherDocuments" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "videoIntroKey" TEXT,
    "photoKey" TEXT,
    "certificationKey" TEXT,
    "awardsKey" TEXT,
    "dobProofKey" TEXT,
    "addressProofKey" TEXT,
    "qualificationProofKey" TEXT,
    "panCardNumber" TEXT,

    CONSTRAINT "TeacherDocuments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_cognitoId_key" ON "Teacher"("cognitoId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_email_key" ON "Teacher"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfessional_teacherId_key" ON "TeacherProfessional"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherDocuments_teacherId_key" ON "TeacherDocuments"("teacherId");

-- AddForeignKey
ALTER TABLE "TeacherProfessional" ADD CONSTRAINT "TeacherProfessional_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherDocuments" ADD CONSTRAINT "TeacherDocuments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
