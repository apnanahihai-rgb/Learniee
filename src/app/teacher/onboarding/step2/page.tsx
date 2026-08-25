"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FormData {
  referredBy: string;
  qualifications: string;
  overallExperience: string;
  comfortableLanguage: string;
  schoolsTaught: string;

  workingInSchool: boolean;
  schoolName: string;

  workingInAcademy: boolean;
  academyName: string;

  homeTuitionArea: string;
  studentsTaught: string;
  canTakeHomeTuition: string;
  hoursPerDay: string;

  haveOwnNotes: string;
  canMakePresentations: string;
  provideHomework: string;
  conductPTM: string;

  hasLaptop: boolean;
  hasPenTab: boolean;
  proficientInEnglish: boolean;

  additionalInfo: string;

  facebook: string;
  linkedin: string;
  instagram: string;
  youtube: string;

  notWithOtherAcademy: boolean;
}

const initialFormData: FormData = {
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
};

export default function TeacherStep2() {
  const router = useRouter();

  const [teacherId, setTeacherId] =
    useState<string | null>(null);

  const [formData, setFormData] =
    useState<FormData>(initialFormData);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  /**
   * Load existing Step 2 data
   */
  useEffect(() => {
    async function loadTeacherData() {
      try {
        setLoading(true);
        setError("");

        const storedTeacherId =
          localStorage.getItem("teacherId");

        if (!storedTeacherId) {
          router.push(
            "/teacher/onboarding/step1"
          );
          return;
        }

        setTeacherId(storedTeacherId);

        const res = await fetch(
          "/api/teacher/onboarding/step2",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!res.ok) {
          throw new Error(
            "Failed to load professional information."
          );
        }

        const data = await res.json();

        const professionalInfo =
          data.professionalInfo;

        if (professionalInfo) {
          setFormData({
            referredBy:
              professionalInfo.referredBy ?? "",

            qualifications:
              professionalInfo.qualifications ?? "",

            overallExperience:
              professionalInfo.overallExperience ?? "",

            comfortableLanguage:
              professionalInfo.comfortableLanguage ?? "",

            schoolsTaught:
              professionalInfo.schoolsTaught ?? "",

            workingInSchool:
              professionalInfo.workingInSchool ?? false,

            schoolName:
              professionalInfo.schoolName ?? "",

            workingInAcademy:
              professionalInfo.workingInAcademy ?? false,

            academyName:
              professionalInfo.academyName ?? "",

            homeTuitionArea:
              professionalInfo.homeTuitionArea ?? "",

            studentsTaught:
              professionalInfo.studentsTaught ?? "",

            canTakeHomeTuition:
              professionalInfo.canTakeHomeTuition ?? "",

            hoursPerDay:
              professionalInfo.hoursPerDay ?? "",

            haveOwnNotes:
              professionalInfo.haveOwnNotes ?? "",

            canMakePresentations:
              professionalInfo.canMakePresentations ?? "",

            provideHomework:
              professionalInfo.provideHomework ?? "",

            conductPTM:
              professionalInfo.conductPTM ?? "",

            hasLaptop:
              professionalInfo.hasLaptop ?? false,

            hasPenTab:
              professionalInfo.hasPenTab ?? false,

            proficientInEnglish:
              professionalInfo.proficientInEnglish ?? false,

            additionalInfo:
              professionalInfo.additionalInfo ?? "",

            facebook:
              professionalInfo.facebook ?? "",

            linkedin:
              professionalInfo.linkedin ?? "",

            instagram:
              professionalInfo.instagram ?? "",

            youtube:
              professionalInfo.youtube ?? "",

            notWithOtherAcademy:
              professionalInfo.notWithOtherAcademy ??
              false,
          });
        }
      } catch (error) {
        console.error(error);

        setError(
          "Unable to load your professional information."
        );
      } finally {
        setLoading(false);
      }
    }

    loadTeacherData();
  }, [router]);

  /**
   * Handle text/select changes
   */
  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement |
      HTMLSelectElement |
      HTMLTextAreaElement
    >
  ) {
    const target = e.target;

    const value =
      target instanceof HTMLInputElement &&
      target.type === "checkbox"
        ? target.checked
        : target.value;

    setFormData((prev) => ({
      ...prev,
      [target.name]: value,
    }));
  }

  /**
   * Submit Step 2
   */
  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!teacherId) {
      setError("Teacher ID is missing.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const res = await fetch(
        "/api/teacher/onboarding/step2",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            teacherId,
            ...formData,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Failed to save Step 2."
        );
      }

      // Keep teacherId for Step 3
      localStorage.setItem(
        "teacherId",
        data.teacherId
      );

      router.push(
        "/teacher/onboarding/step3"
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to save Step 2."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">
          Loading professional information...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-xl shadow-sm border mt-10">

      <h2 className="text-2xl font-bold text-center text-purple-600 mb-8">
        Professional Information
      </h2>

      {error && (
        <div className="mb-6 rounded-lg bg-red-100 text-red-700 p-4">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >

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
            <option value="">
              Referred by
            </option>

            <option value="website">
              Website
            </option>

            <option value="friend">
              Friend
            </option>

            <option value="social_media">
              Social Media
            </option>

            <option value="other">
              Other
            </option>
          </select>

          <Input
            name="qualifications"
            placeholder="Qualifications"
            value={formData.qualifications}
            onChange={handleChange}
          />

        </div>

        {/* -------------------------------- */}
        {/* EXPERIENCE */}
        {/* -------------------------------- */}

        <h3 className="font-semibold text-gray-800 mt-6">
          Experience
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <select
            name="overallExperience"
            value={formData.overallExperience}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
          >
            <option value="">
              Overall Teaching Experience
            </option>

            <option value="0">
              Less than 1 year
            </option>

            <option value="1-3">
              1-3 years
            </option>

            <option value="3-5">
              3-5 years
            </option>

            <option value="5-10">
              5-10 years
            </option>

            <option value="10+">
              10+ years
            </option>
          </select>

          <Input
            name="comfortableLanguage"
            placeholder="Comfortable Language"
            value={formData.comfortableLanguage}
            onChange={handleChange}
          />

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
            Upload Certifications
            <br />
            <span className="text-xs">
              S3 Logic later
            </span>
          </div>

          <div className="border rounded-md p-3 text-sm text-gray-500 bg-gray-50 text-center">
            Upload Awards
            <br />
            <span className="text-xs">
              S3 Logic later
            </span>
          </div>

        </div>

        {/* -------------------------------- */}
        {/* CURRENT WORK */}
        {/* -------------------------------- */}

        <div className="grid grid-cols-[auto_1fr] items-center gap-4">

          <label className="flex items-center space-x-2 text-sm text-gray-600">

            <input
              type="checkbox"
              name="workingInSchool"
              checked={formData.workingInSchool}
              onChange={handleChange}
            />

            <span>
              Working in a School
            </span>

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

            <span>
              Working in an Academy
            </span>

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

          <Input
            name="homeTuitionArea"
            placeholder="Area you live for Home Tuition"
            value={formData.homeTuitionArea}
            onChange={handleChange}
          />

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
            <option value="">
              Can you take Home Tuition
            </option>

            <option value="Yes">
              Yes
            </option>

            <option value="No">
              No
            </option>
          </select>

          <select
            name="hoursPerDay"
            value={formData.hoursPerDay}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
          >
            <option value="">
              No of hours can teach a day
            </option>

            <option value="1">
              1 hour
            </option>

            <option value="2">
              2 hours
            </option>

            <option value="3">
              3 hours
            </option>

            <option value="4">
              4 hours
            </option>

            <option value="5+">
              5+ hours
            </option>
          </select>

          <select
            name="haveOwnNotes"
            value={formData.haveOwnNotes}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
          >
            <option value="">
              Do you have your own notes
            </option>

            <option value="Yes">
              Yes
            </option>

            <option value="No">
              No
            </option>
          </select>

          <select
            name="canMakePresentations"
            value={formData.canMakePresentations}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
          >
            <option value="">
              Can you make Presentations
            </option>

            <option value="Yes">
              Yes
            </option>

            <option value="No">
              No
            </option>
          </select>

          <select
            name="provideHomework"
            value={formData.provideHomework}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
          >
            <option value="">
              Will you provide homeworks & tests
            </option>

            <option value="Yes">
              Yes
            </option>

            <option value="No">
              No
            </option>
          </select>

          <select
            name="conductPTM"
            value={formData.conductPTM}
            onChange={handleChange}
            className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
          >
            <option value="">
              Conduct parent-teacher meetings
            </option>

            <option value="Yes">
              Yes
            </option>

            <option value="No">
              No
            </option>
          </select>

        </div>

        {/* -------------------------------- */}
        {/* EQUIPMENT */}
        {/* -------------------------------- */}

        <div className="flex flex-wrap gap-6 text-sm text-gray-600">

          <label className="flex items-center space-x-2">

            <input
              type="checkbox"
              name="hasLaptop"
              checked={formData.hasLaptop}
              onChange={handleChange}
            />

            <span>
              I have a Laptop
            </span>

          </label>

          <label className="flex items-center space-x-2">

            <input
              type="checkbox"
              name="hasPenTab"
              checked={formData.hasPenTab}
              onChange={handleChange}
            />

            <span>
              I have a PenTab
            </span>

          </label>

          <label className="flex items-center space-x-2">

            <input
              type="checkbox"
              name="proficientInEnglish"
              checked={
                formData.proficientInEnglish
              }
              onChange={handleChange}
            />

            <span>
              I am Proficient in English
            </span>

          </label>

        </div>

        {/* -------------------------------- */}
        {/* ADDITIONAL INFORMATION */}
        {/* -------------------------------- */}

        <div>

          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Anything else that you would like to
            share with us? [OPTIONAL]
          </label>

          <textarea
            name="additionalInfo"
            placeholder="Type..."
            value={formData.additionalInfo}
            onChange={handleChange}
            rows={4}
            className="w-full border rounded-md p-3 text-sm text-gray-600"
          />

        </div>

        {/* -------------------------------- */}
        {/* SOCIAL MEDIA */}
        {/* -------------------------------- */}

        <h3 className="font-semibold text-gray-800 mt-6">
          Social Media
        </h3>

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
        {/* OTHER ACADEMY */}
        {/* -------------------------------- */}

        <label className="flex items-center space-x-2 text-sm text-gray-600">

          <input
            type="checkbox"
            name="notWithOtherAcademy"
            checked={
              formData.notWithOtherAcademy
            }
            onChange={handleChange}
          />

          <span>
            I am not working with any other academy
          </span>

        </label>

        {/* -------------------------------- */}
        {/* BUTTONS */}
        {/* -------------------------------- */}

        <div className="flex justify-center gap-4 pt-4">

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              router.back()
            }
            className="w-40 rounded-full border-purple-600 text-purple-600"
            disabled={saving}
          >
            Back
          </Button>

          <Button
            type="submit"
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 text-white w-40 rounded-full"
          >
            {saving
              ? "Saving..."
              : "Next"}
          </Button>

        </div>

      </form>
    </div>
  );
}