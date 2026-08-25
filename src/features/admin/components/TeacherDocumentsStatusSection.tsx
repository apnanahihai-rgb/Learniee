import { Section, InfoField } from "@/features/admin/components/shared/ReviewSection";
import type { AdminTeacher } from "@/features/admin/types/teacher";

export default function TeacherDocumentsStatusSection({ teacher }: { teacher: AdminTeacher }) {
  const docs = teacher.documents;

  return (
    <>
      <Section title="Documents">
        <InfoField label="PAN Card Number" value={docs?.panCardNumber} />
        <InfoField label="Video Introduction" value={docs?.videoIntroKey} />
        <InfoField label="Photo" value={docs?.photoKey} />
        <InfoField label="Certification" value={docs?.certificationKey} />
        <InfoField label="Awards" value={docs?.awardsKey} />
        <InfoField label="DOB Proof" value={docs?.dobProofKey} />
        <InfoField label="Address Proof" value={docs?.addressProofKey} />
        <InfoField label="Qualification Proof" value={docs?.qualificationProofKey} />
      </Section>

      <Section title="Application Status">
        <InfoField label="Onboarding" value={teacher.onboardingComplete ? "Completed" : "Incomplete"} />
        <InfoField label="Approval Status" value={teacher.approvalStatus} />
        <InfoField label="Created At" value={new Date(teacher.createdAt).toLocaleString()} />
        <InfoField label="Updated At" value={new Date(teacher.updatedAt).toLocaleString()} />
      </Section>
    </>
  );
}
