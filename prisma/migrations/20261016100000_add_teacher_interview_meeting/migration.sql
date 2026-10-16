-- CreateTable
-- Google Meet room for a Teacher's interview. Additive only.
CREATE TABLE "TeacherInterviewMeeting" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "meetSpaceName" TEXT NOT NULL,
    "meetingUri" TEXT NOT NULL,
    "organizerEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherInterviewMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherInterviewMeeting_teacherId_key" ON "TeacherInterviewMeeting"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherInterviewMeeting_organizerEmail_createdAt_idx" ON "TeacherInterviewMeeting"("organizerEmail", "createdAt");

-- AddForeignKey
ALTER TABLE "TeacherInterviewMeeting" ADD CONSTRAINT "TeacherInterviewMeeting_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
