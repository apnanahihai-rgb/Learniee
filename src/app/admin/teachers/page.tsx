"use client";

import { useEffect, useState } from "react";

interface Teacher {
  id: string;
  cognitoId: string;
  email: string;
  firstName: string;
  lastName: string;
  visibleName: string | null;

  dobDay: number | null;
  dobMonth: string | null;
  dobYear: number | null;

  gender: string | null;
  nationality: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  pincode: string | null;
  phone: string | null;
  whatsapp: string | null;
  aboutMe: string | null;
  criminalCase: string | null;

  onboardingComplete: boolean;
  approvalStatus: string;
  createdAt: string;
  updatedAt: string;

  professionalInfo: {
    referredBy: string | null;
    qualifications: string | null;
    overallExperience: string | null;
    comfortableLanguage: string | null;
    schoolsTaught: string | null;

    workingInSchool: boolean;
    schoolName: string | null;

    workingInAcademy: boolean;
    academyName: string | null;

    homeTuitionArea: string | null;
    studentsTaught: string | null;
    canTakeHomeTuition: string | null;
    hoursPerDay: string | null;

    haveOwnNotes: string | null;
    canMakePresentations: string | null;
    provideHomework: string | null;
    conductPTM: string | null;

    hasLaptop: boolean;
    hasPenTab: boolean;
    proficientInEnglish: boolean;

    notWithOtherAcademy: boolean;

    additionalInfo: string | null;

    facebook: string | null;
    linkedin: string | null;
    instagram: string | null;
    youtube: string | null;
  } | null;

  documents: {
    videoIntroKey: string | null;
    photoKey: string | null;
    certificationKey: string | null;
    awardsKey: string | null;
    dobProofKey: string | null;
    addressProofKey: string | null;
    qualificationProofKey: string | null;
    panCardNumber: string | null;
  } | null;
}

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTeachers();
  }, []);

  async function fetchTeachers() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/teachers");

      if (!res.ok) {
        throw new Error("Failed to fetch teachers");
      }

      const data = await res.json();

      setTeachers(data.teachers);
    } catch (error) {
      console.error(error);
      setError("Unable to load teachers.");
    } finally {
      setLoading(false);
    }
  }
  async function updateApproval(
    teacherId: string,
    status: "APPROVED" | "REJECTED",
  ) {
    try {
      const res = await fetch(`/api/admin/teachers/${teacherId}/approval`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update approval");
      }

      // Remove the teacher from the pending list
      setTeachers((currentTeachers) =>
        currentTeachers.filter((teacher) => teacher.id !== teacherId),
      );
    } catch (error) {
      console.error(error);
      setError("Failed to update teacher approval status.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading teachers...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-purple-600">
            Teacher Approvals
          </h1>

          <p className="text-gray-500 mt-1">
            Review complete teacher onboarding information.
          </p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {teachers.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center">
            <p className="text-gray-500">
              No teachers are waiting for approval.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="bg-white border rounded-2xl shadow-sm p-8"
              >
                {/* ================================= */}
                {/* HEADER */}
                {/* ================================= */}

                <div className="flex justify-between items-start border-b pb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      {teacher.firstName} {teacher.lastName}
                    </h2>

                    <p className="text-gray-500">{teacher.email}</p>

                    {teacher.visibleName && (
                      <p className="text-sm text-gray-400 mt-1">
                        Visible name: {teacher.visibleName}
                      </p>
                    )}
                  </div>

                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      teacher.approvalStatus === "PENDING"
                        ? "bg-yellow-100 text-yellow-700"
                        : teacher.approvalStatus === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {teacher.approvalStatus}
                  </span>
                </div>

                {/* ================================= */}
                {/* PERSONAL INFORMATION */}
                {/* ================================= */}

                <Section title="Personal Information">
                  <Info label="First Name" value={teacher.firstName} />
                  <Info label="Last Name" value={teacher.lastName} />
                  <Info label="Email" value={teacher.email} />
                  <Info label="Visible Name" value={teacher.visibleName} />

                  <Info
                    label="Date of Birth"
                    value={
                      teacher.dobDay && teacher.dobMonth && teacher.dobYear
                        ? `${teacher.dobDay} ${teacher.dobMonth} ${teacher.dobYear}`
                        : null
                    }
                  />

                  <Info label="Gender" value={teacher.gender} />
                  <Info label="Nationality" value={teacher.nationality} />
                  <Info label="Phone" value={teacher.phone} />
                  <Info label="WhatsApp" value={teacher.whatsapp} />
                </Section>

                {/* ================================= */}
                {/* ADDRESS */}
                {/* ================================= */}

                <Section title="Address Information">
                  <Info label="Address" value={teacher.address} />
                  <Info label="City" value={teacher.city} />
                  <Info label="Country" value={teacher.country} />
                  <Info label="Pincode" value={teacher.pincode} />
                </Section>

                {/* ================================= */}
                {/* ABOUT */}
                {/* ================================= */}

                <Section title="About Teacher">
                  <div className="md:col-span-3">
                    <Info label="About Me" value={teacher.aboutMe} />
                  </div>

                  <Info
                    label="Criminal Court Case"
                    value={teacher.criminalCase}
                  />
                </Section>

                {/* ================================= */}
                {/* PROFESSIONAL INFORMATION */}
                {/* ================================= */}

                <Section title="Professional Information">
                  <Info
                    label="Referred By"
                    value={teacher.professionalInfo?.referredBy}
                  />

                  <Info
                    label="Qualifications"
                    value={teacher.professionalInfo?.qualifications}
                  />

                  <Info
                    label="Overall Experience"
                    value={teacher.professionalInfo?.overallExperience}
                  />

                  <Info
                    label="Comfortable Language"
                    value={teacher.professionalInfo?.comfortableLanguage}
                  />

                  <div className="md:col-span-3">
                    <Info
                      label="Schools Taught"
                      value={teacher.professionalInfo?.schoolsTaught}
                    />
                  </div>
                </Section>

                {/* ================================= */}
                {/* WORK EXPERIENCE */}
                {/* ================================= */}

                <Section title="Current Work">
                  <Info
                    label="Working in School"
                    value={
                      teacher.professionalInfo?.workingInSchool ? "Yes" : "No"
                    }
                  />

                  <Info
                    label="School Name"
                    value={teacher.professionalInfo?.schoolName}
                  />

                  <Info
                    label="Working in Academy"
                    value={
                      teacher.professionalInfo?.workingInAcademy ? "Yes" : "No"
                    }
                  />

                  <Info
                    label="Academy Name"
                    value={teacher.professionalInfo?.academyName}
                  />
                </Section>

                {/* ================================= */}
                {/* TUITION INFORMATION */}
                {/* ================================= */}

                <Section title="Tuition Information">
                  <Info
                    label="Home Tuition Area"
                    value={teacher.professionalInfo?.homeTuitionArea}
                  />

                  <Info
                    label="Students Taught"
                    value={teacher.professionalInfo?.studentsTaught}
                  />

                  <Info
                    label="Can Take Home Tuition"
                    value={teacher.professionalInfo?.canTakeHomeTuition}
                  />

                  <Info
                    label="Hours Per Day"
                    value={teacher.professionalInfo?.hoursPerDay}
                  />

                  <Info
                    label="Own Notes"
                    value={teacher.professionalInfo?.haveOwnNotes}
                  />

                  <Info
                    label="Can Make Presentations"
                    value={teacher.professionalInfo?.canMakePresentations}
                  />

                  <Info
                    label="Provides Homework & Tests"
                    value={teacher.professionalInfo?.provideHomework}
                  />

                  <Info
                    label="Conducts PTM"
                    value={teacher.professionalInfo?.conductPTM}
                  />
                </Section>

                {/* ================================= */}
                {/* EQUIPMENT / SKILLS */}
                {/* ================================= */}

                <Section title="Equipment & Skills">
                  <Info
                    label="Has Laptop"
                    value={teacher.professionalInfo?.hasLaptop ? "Yes" : "No"}
                  />

                  <Info
                    label="Has Pen Tablet"
                    value={teacher.professionalInfo?.hasPenTab ? "Yes" : "No"}
                  />

                  <Info
                    label="Proficient in English"
                    value={
                      teacher.professionalInfo?.proficientInEnglish
                        ? "Yes"
                        : "No"
                    }
                  />

                  <Info
                    label="Not Working With Other Academy"
                    value={
                      teacher.professionalInfo?.notWithOtherAcademy
                        ? "Yes"
                        : "No"
                    }
                  />
                </Section>

                {/* ================================= */}
                {/* ADDITIONAL INFORMATION */}
                {/* ================================= */}

                <Section title="Additional Information">
                  <div className="md:col-span-3">
                    <Info
                      label="Additional Information"
                      value={teacher.professionalInfo?.additionalInfo}
                    />
                  </div>
                </Section>

                {/* ================================= */}
                {/* SOCIAL MEDIA */}
                {/* ================================= */}

                <Section title="Social Media">
                  <Info
                    label="Facebook"
                    value={teacher.professionalInfo?.facebook}
                  />

                  <Info
                    label="LinkedIn"
                    value={teacher.professionalInfo?.linkedin}
                  />

                  <Info
                    label="Instagram"
                    value={teacher.professionalInfo?.instagram}
                  />

                  <Info
                    label="YouTube"
                    value={teacher.professionalInfo?.youtube}
                  />
                </Section>

                {/* ================================= */}
                {/* DOCUMENTS */}
                {/* ================================= */}

                <Section title="Documents">
                  <Info
                    label="PAN Card Number"
                    value={teacher.documents?.panCardNumber}
                  />

                  <Info
                    label="Video Introduction"
                    value={teacher.documents?.videoIntroKey}
                  />

                  <Info label="Photo" value={teacher.documents?.photoKey} />

                  <Info
                    label="Certification"
                    value={teacher.documents?.certificationKey}
                  />

                  <Info label="Awards" value={teacher.documents?.awardsKey} />

                  <Info
                    label="DOB Proof"
                    value={teacher.documents?.dobProofKey}
                  />

                  <Info
                    label="Address Proof"
                    value={teacher.documents?.addressProofKey}
                  />

                  <Info
                    label="Qualification Proof"
                    value={teacher.documents?.qualificationProofKey}
                  />
                </Section>

                {/* ================================= */}
                {/* SYSTEM STATUS */}
                {/* ================================= */}

                <Section title="Application Status">
                  <Info
                    label="Onboarding"
                    value={
                      teacher.onboardingComplete ? "Completed" : "Incomplete"
                    }
                  />

                  <Info
                    label="Approval Status"
                    value={teacher.approvalStatus}
                  />

                  <Info
                    label="Created At"
                    value={new Date(teacher.createdAt).toLocaleString()}
                  />

                  <Info
                    label="Updated At"
                    value={new Date(teacher.updatedAt).toLocaleString()}
                  />
                </Section>

                {/* ================================= */}
                {/* ACTIONS */}
                {/* ================================= */}

                <div className="flex gap-4 mt-8 pt-6 border-t">
                  <button
                    onClick={() => updateApproval(teacher.id, "APPROVED")}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
                  >
                    Approve
                  </button>

                  <button
                    onClick={() => updateApproval(teacher.id, "REJECTED")}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================= */
/* REUSABLE SECTION */
/* ================================= */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-purple-600 mb-4 border-b pb-2">
        {title}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{children}</div>
    </div>
  );
}

/* ================================= */
/* REUSABLE INFO */
/* ================================= */

function Info({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase">{label}</p>

      <p className="text-gray-700 mt-1 break-words">
        {value !== null && value !== undefined && value !== ""
          ? value
          : "Not provided"}
      </p>
    </div>
  );
}
