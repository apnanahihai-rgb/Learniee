-- CreateTable
CREATE TABLE "ParentProfile" (
    "id" TEXT NOT NULL,
    "cognitoSub" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "visibleName" TEXT,
    "tuitionType" TEXT,
    "nationality" TEXT,
    "nriOrIndian" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "pincode" TEXT,
    "currency" TEXT,
    "timezone" TEXT,
    "phone" TEXT NOT NULL,
    "whatsappNumber" TEXT,
    "email" TEXT NOT NULL,
    "relationToStudent" TEXT,
    "childStatus" TEXT,
    "onlineTuition" TEXT,
    "modeOfCommunication" TEXT,
    "childInterest" TEXT,
    "favoriteSubject" TEXT,
    "weakSubject" TEXT,
    "preferredLanguage" TEXT,
    "howDidYouHear" TEXT,
    "suggestions" TEXT,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "visibleName" TEXT,
    "gender" TEXT,
    "age" INTEGER,
    "dateOfBirth" TIMESTAMP(3),
    "standard" TEXT,
    "board" TEXT,
    "currentSchoolName" TEXT,
    "learningDifficulties" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParentProfile_cognitoSub_key" ON "ParentProfile"("cognitoSub");

-- CreateIndex
CREATE UNIQUE INDEX "ParentProfile_email_key" ON "ParentProfile"("email");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
