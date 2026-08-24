"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function TeacherStep2() {
  const router = useRouter();

  const [teacherId, setTeacherId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    referredBy: "",
    qualifications: "",
    overallExperience: "",
    comfortableLanguage: "",
    schoolsTaught: "",

    workingInSchool: false,
    schoolName: "",

    workingInAcademy: false,
    academyName: "",

    homeTuitionArea: "",
    studentsTaught: "",
    canTakeHomeTuition: "",
    hoursPerDay: "",
    haveOwnNotes: "",
    canMakePresentations: "",
    provideHomework: "",
    conductPTM: "",

    hasLaptop: false,
    hasPenTab: false,
    proficientInEnglish: false,

    additionalInfo: "",

    facebook: "",
    linkedin: "",
    instagram: "",
    youtube: "",

    notWithOtherAcademy: false,
  });

  // Get teacher ID
  useEffect(() => {
    const id = localStorage.getItem("teacherId");

    if (!id) {
      router.push("/teacher/onboarding/step1");
      return;
    }

    setTeacherId(id);
  }, [router]);

  // Handle all inputs
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const target = e.target as HTMLInputElement;

    const value = target.type === "checkbox" ? target.checked : target.value;

    setFormData((prev) => ({
      ...prev,
      [target.name]: value,
    }));
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teacherId) {
      alert("Teacher ID is missing.");
      return;
    }

    const res = await fetch("/api/teacher/onboarding/step2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...formData,
        teacherId,
      }),
    });

    if (res.ok) {
      router.push("/teacher/onboarding/step3");
    } else {
      const data = await res.json();
      console.error(data);
      alert("Failed to save professional information.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-xl shadow-sm border mt-10">
      <h2 className="text-2xl font-bold text-center text-purple-600 mb-8">
        Professional Information
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* -------------------------------- */}
        {/* BASIC PROFESSIONAL INFORMATION */}
        {/* -------------------------------- */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            name="referredBy"
            value={formData.referredBy}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
          >
            <option value="">Referred by</option>
            <option value="friend">Friend</option>
            <option value="social_media">Social Media</option>
            <option value="website">Website</option>
            <option value="other">Other</option>
          </select>

          <select
            name="qualifications"
            value={formData.qualifications}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
          >
            <option value="">Qualifications</option>
            <option value="bachelors">Bachelor's Degree</option>
            <option value="masters">Master's Degree</option>
            <option value="phd">PhD</option>
            <option value="diploma">Diploma</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* -------------------------------- */}
        {/* EXPERIENCE */}
        {/* -------------------------------- */}

        <h3 className="font-semibold text-gray-800 mt-6">Experience</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            name="overallExperience"
            value={formData.overallExperience}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
          >
            <option value="">Overall Teaching Experience</option>
            <option value="0-1">0 - 1 Years</option>
            <option value="1-3">1 - 3 Years</option>
            <option value="3-5">3 - 5 Years</option>
            <option value="5-10">5 - 10 Years</option>
            <option value="10+">10+ Years</option>
          </select>

          <select
            name="comfortableLanguage"
            value={formData.comfortableLanguage}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
          >
            <option value="">Comfortable Language</option>
            <option value="english">English</option>
            <option value="hindi">Hindi</option>
            <option value="marathi">Marathi</option>
            <option value="other">Other</option>
          </select>
        </div>

        <Input
          name="schoolsTaught"
          placeholder="Schools you taught before"
          value={formData.schoolsTaught}
          onChange={handleChange}
        />

        {/* -------------------------------- */}
        {/* FILE PLACEHOLDERS */}
        {/* -------------------------------- */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-md p-3 text-sm text-gray-500 bg-gray-50 text-center">
            Upload Certifications (S3 Logic later)
          </div>

          <div className="border rounded-md p-3 text-sm text-gray-500 bg-gray-50 text-center">
            Upload Awards (S3 Logic later)
          </div>
        </div>

        {/* -------------------------------- */}
        {/* WORKING IN SCHOOL / ACADEMY */}
        {/* -------------------------------- */}

        <div className="grid grid-cols-[auto_1fr] items-center gap-4">
          <label className="flex items-center space-x-2 text-sm text-gray-600">
            <input
              type="checkbox"
              name="workingInSchool"
              checked={formData.workingInSchool}
              onChange={handleChange}
            />
            <span>Working in a School</span>
          </label>

          <Input
            name="schoolName"
            placeholder="School Name"
            value={formData.schoolName}
            disabled={!formData.workingInSchool}
            onChange={handleChange}
          />

          <label className="flex items-center space-x-2 text-sm text-gray-600">
            <input
              type="checkbox"
              name="workingInAcademy"
              checked={formData.workingInAcademy}
              onChange={handleChange}
            />
            <span>Working in an Academy</span>
          </label>

          <Input
            name="academyName"
            placeholder="Academy Name"
            value={formData.academyName}
            disabled={!formData.workingInAcademy}
            onChange={handleChange}
          />
        </div>

        {/* -------------------------------- */}
        {/* TEACHING PREFERENCES */}
        {/* -------------------------------- */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            name="homeTuitionArea"
            value={formData.homeTuitionArea}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
          >
            <option value="">Area you live for Home Tuition</option>
            <option value="local">Local Area</option>
            <option value="nearby">Nearby Areas</option>
            <option value="anywhere">Anywhere</option>
          </select>

          <Input
            name="studentsTaught"
            placeholder="Number of Students taught"
            value={formData.studentsTaught}
            onChange={handleChange}
          />

          <select
            name="canTakeHomeTuition"
            value={formData.canTakeHomeTuition}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
          >
            <option value="">Can you take Home Tuition</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>

          <select
            name="hoursPerDay"
            value={formData.hoursPerDay}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
          >
            <option value="">No of hours can teach a day</option>
            <option value="1-2">1 - 2 Hours</option>
            <option value="3-4">3 - 4 Hours</option>
            <option value="5-6">5 - 6 Hours</option>
            <option value="6+">6+ Hours</option>
          </select>

          <select
            name="haveOwnNotes"
            value={formData.haveOwnNotes}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
          >
            <option value="">Do you have your own notes</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>

          <select
            name="canMakePresentations"
            value={formData.canMakePresentations}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
          >
            <option value="">Can you make Presentations</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>

          <select
            name="provideHomework"
            value={formData.provideHomework}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
          >
            <option value="">Will you provide homeworks & tests</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>

          <select
            name="conductPTM"
            value={formData.conductPTM}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
          >
            <option value="">Conduct parent-teacher meetings</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        {/* -------------------------------- */}
        {/* EQUIPMENT / SKILLS */}
        {/* -------------------------------- */}

        <div className="flex flex-wrap gap-6 text-sm text-gray-600">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="hasLaptop"
              checked={formData.hasLaptop}
              onChange={handleChange}
            />
            <span>I have a Laptop</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="hasPenTab"
              checked={formData.hasPenTab}
              onChange={handleChange}
            />
            <span>I have a PenTab</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="proficientInEnglish"
              checked={formData.proficientInEnglish}
              onChange={handleChange}
            />
            <span>I am Proficient in English</span>
          </label>
        </div>

        {/* -------------------------------- */}
        {/* ADDITIONAL INFORMATION */}
        {/* -------------------------------- */}

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Anything else that you would like to share with us? [OPTIONAL]
          </label>

          <Input
            name="additionalInfo"
            placeholder="Type.."
            value={formData.additionalInfo}
            onChange={handleChange}
          />
        </div>

        {/* -------------------------------- */}
        {/* SOCIAL MEDIA */}
        {/* -------------------------------- */}

        <h3 className="font-semibold text-gray-800 mt-6">Social Media</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            name="facebook"
            placeholder="Facebook"
            value={formData.facebook}
            onChange={handleChange}
          />

          <Input
            name="linkedin"
            placeholder="LinkedIn"
            value={formData.linkedin}
            onChange={handleChange}
          />

          <Input
            name="instagram"
            placeholder="Instagram"
            value={formData.instagram}
            onChange={handleChange}
          />

          <Input
            name="youtube"
            placeholder="Youtube"
            value={formData.youtube}
            onChange={handleChange}
          />
        </div>

        {/* -------------------------------- */}
        {/* ADD MORE */}
        {/* -------------------------------- */}

        <div className="flex justify-center my-4">
          <Button
            type="button"
            variant="outline"
            className="text-purple-600 border-purple-600 rounded-full px-6"
          >
            + Add More
          </Button>
        </div>

        {/* -------------------------------- */}
        {/* OTHER ACADEMY */}
        {/* -------------------------------- */}

        <label className="flex items-center space-x-2 text-sm text-gray-600">
          <input
            type="checkbox"
            name="notWithOtherAcademy"
            checked={formData.notWithOtherAcademy}
            onChange={handleChange}
          />

          <span>I am not working with any other academy</span>
        </label>

        {/* -------------------------------- */}
        {/* BUTTONS */}
        {/* -------------------------------- */}

        <div className="flex justify-center gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="w-40 rounded-full border-purple-600 text-purple-600"
          >
            Back
          </Button>

          <Button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white w-40 rounded-full"
          >
            Next
          </Button>
        </div>
      </form>
    </div>
  );
}
