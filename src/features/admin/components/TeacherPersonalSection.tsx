import { Section, InfoField } from "@/features/admin/components/shared/ReviewSection";
import type { AdminTeacher } from "@/features/admin/types/teacher";

export default function TeacherPersonalSection({ teacher }: { teacher: AdminTeacher }) {
  return (
    <>
      <Section title="Personal Information">
        <InfoField label="First Name" value={teacher.firstName} />
        <InfoField label="Last Name" value={teacher.lastName} />
        <InfoField label="Email" value={teacher.email} />
        <InfoField label="Visible Name" value={teacher.visibleName} />

        <InfoField
          label="Date of Birth"
          value={
            teacher.dobDay && teacher.dobMonth && teacher.dobYear
              ? `${teacher.dobDay} ${teacher.dobMonth} ${teacher.dobYear}`
              : null
          }
        />

        <InfoField label="Gender" value={teacher.gender} />
        <InfoField label="Nationality" value={teacher.nationality} />
        <InfoField label="Phone" value={teacher.phone} />
        <InfoField label="WhatsApp" value={teacher.whatsapp} />
      </Section>

      <Section title="Address Information">
        <InfoField label="Address" value={teacher.address} />
        <InfoField label="City" value={teacher.city} />
        <InfoField label="Country" value={teacher.country} />
        <InfoField label="Pincode" value={teacher.pincode} />
      </Section>

      <Section title="About Teacher">
        <div className="md:col-span-3">
          <InfoField label="About Me" value={teacher.aboutMe} />
        </div>
        <InfoField label="Criminal Court Case" value={teacher.criminalCase} />
      </Section>
    </>
  );
}
