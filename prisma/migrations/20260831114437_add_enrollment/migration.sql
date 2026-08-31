-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "ageGroup" TEXT,
ADD COLUMN     "rejectionReason" TEXT;

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
CREATE UNIQUE INDEX "TeacherDocuments_teacherId_key" ON "TeacherDocuments"("teacherId");

-- AddForeignKey
ALTER TABLE "TeacherDocuments" ADD CONSTRAINT "TeacherDocuments_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
