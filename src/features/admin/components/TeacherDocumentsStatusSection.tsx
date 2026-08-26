import { Section, InfoField } from "@/features/admin/components/shared/ReviewSection";
import type { AdminTeacher } from "@/features/admin/types/teacher";

function DocumentField({ label, url }: { label: string; url: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase">{label}</p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-purple-600 hover:text-purple-800 underline underline-offset-2"
        >
          View file
        </a>
      ) : (
        <p className="text-gray-400 mt-1">Not uploaded</p>
      )}
    </div>
  );
}

export default function TeacherDocumentsStatusSection({ teacher }: { teacher: AdminTeacher }) {
  const docs = teacher.documents;

  return (
    <>
      <Section title="Documents">
        <InfoField label="PAN Card Number" value={docs?.panCardNumber} />
        <DocumentField label="Video Introduction" url={docs?.videoIntroUrl} />
        <DocumentField label="Photo" url={docs?.photoUrl} />
        <DocumentField label="Certification" url={docs?.certificationUrl} />
        <DocumentField label="Awards" url={docs?.awardsUrl} />
        <DocumentField label="DOB Proof" url={docs?.dobProofUrl} />
        <DocumentField label="Address Proof" url={docs?.addressProofUrl} />
        <DocumentField label="Qualification Proof" url={docs?.qualificationProofUrl} />
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