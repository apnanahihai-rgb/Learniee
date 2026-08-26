import { Section, InfoField } from "@/features/admin/components/shared/ReviewSection";
import type { AdminTeacher } from "@/features/admin/types/teacher";

function FilePreview({
  file,
}: {
  file: {
    originalFileName: string;
    mimeType: string;
    viewUrl: string;
  };
}) {
  if (file.mimeType.startsWith("image/")) {
    return (
      <div className="border rounded-lg p-3 bg-gray-50">
        <img
          src={file.viewUrl}
          alt={file.originalFileName}
          className="max-w-full h-48 object-contain rounded"
        />

        <a
          href={file.viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-2 text-sm text-purple-600 hover:underline"
        >
          {file.originalFileName}
        </a>
      </div>
    );
  }

  if (file.mimeType.startsWith("video/")) {
    return (
      <div className="border rounded-lg p-3 bg-gray-50">
        <video
          src={file.viewUrl}
          controls
          className="w-full max-h-64 rounded"
        />

        <p className="text-sm mt-2 text-gray-700 break-all">
          {file.originalFileName}
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <p className="text-sm text-gray-700 break-all">
        {file.originalFileName}
      </p>

      <a
        href={file.viewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-2 text-purple-600 hover:underline"
      >
        View / Open PDF
      </a>
    </div>
  );
}

function FileGroup({
  title,
  files,
}: {
  title: string;
  files: AdminTeacher["files"];
}) {
  if (files.length === 0) {
    return (
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase">
          {title}
        </p>
        <p className="text-gray-400 mt-1">
          Not uploaded
        </p>
      </div>
    );
  }

  return (
    <div className="md:col-span-3">
      <p className="text-xs font-medium text-gray-400 uppercase mb-3">
        {title}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {files.map((file) => (
          <FilePreview
            key={file.id}
            file={file}
          />
        ))}
      </div>
    </div>
  );
}

export default function TeacherDocumentsStatusSection({
  teacher,
}: {
  teacher: AdminTeacher;
}) {
  const files = teacher.files ?? [];

  const profilePhoto = files.filter(
    (file) => file.type === "PROFILE_PHOTO",
  );

  const introVideo = files.filter(
    (file) => file.type === "INTRO_VIDEO",
  );

  const certifications = files.filter(
    (file) => file.type === "CERTIFICATION",
  );

  const awards = files.filter(
    (file) => file.type === "AWARD",
  );

  const dobProof = files.filter(
    (file) => file.type === "DOB_PROOF",
  );

  const addressProof = files.filter(
    (file) => file.type === "ADDRESS_PROOF",
  );

  const qualificationProof = files.filter(
    (file) => file.type === "QUALIFICATION_PROOF",
  );

  return (
    <>
      <Section title="Uploaded Documents">

        <InfoField
          label="PAN Card Number"
          value={teacher.panCardNumber}
        />

        <FileGroup
          title="Profile Photo"
          files={profilePhoto}
        />

        <FileGroup
          title="Video Introduction"
          files={introVideo}
        />

        <FileGroup
          title="Certifications"
          files={certifications}
        />

        <FileGroup
          title="Awards"
          files={awards}
        />

        <FileGroup
          title="Date of Birth Proof"
          files={dobProof}
        />

        <FileGroup
          title="Address Proof"
          files={addressProof}
        />

        <FileGroup
          title="Qualification Proof"
          files={qualificationProof}
        />

      </Section>

      <Section title="Application Status">
        <InfoField
          label="Onboarding"
          value={
            teacher.onboardingStatus === "COMPLETED"
              ? "Completed"
              : "Incomplete"
          }
        />

        <InfoField
          label="Approval Status"
          value={teacher.approvalStatus}
        />

        <InfoField
          label="Created At"
          value={new Date(
            teacher.createdAt,
          ).toLocaleString()}
        />

        <InfoField
          label="Updated At"
          value={new Date(
            teacher.updatedAt,
          ).toLocaleString()}
        />
      </Section>
    </>
  );
}