"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import CountrySelect from "@/features/shared/components/CountrySelect";

import DateOfBirthSelect from "@/features/teacher/components/onboarding/step1/DateOfBirthSelect";
import GenderSelect from "@/features/teacher/components/onboarding/step1/GenderSelect";
import CriminalCaseSelect from "@/features/teacher/components/onboarding/step1/CriminalCaseSelect";
import TeacherMediaPlaceholder from "@/features/teacher/components/onboarding/step1/TeacherMediaPlaceholder";

import { useTeacherStep1Form } from "@/features/teacher/hooks/useTeacherStep1Form";

export default function TeacherStep1() {
  const {
    loading,
    submitting,
    formData,
    handleChange,
    handleSubmit,

    profilePhoto,
    introVideo,

    existingProfilePhoto,
    existingIntroVideo,

    handleProfilePhotoChange,
    handleIntroVideoChange,

    fileErrors,
  } = useTeacherStep1Form();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading your information...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-xl shadow-sm border mt-10">
      <h2 className="text-2xl font-bold text-center text-purple-600 mb-8">
        Registration
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cognito fields */}

          <Input
            name="firstName"
            placeholder="First Name"
            value={formData.firstName}
            onChange={handleChange}
            disabled
            required
          />

          <Input
            name="lastName"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={handleChange}
            disabled
            required
          />

          <Input
            name="email"
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            disabled
            required
          />

          {/* Editable fields */}

          <Input
            name="visibleName"
            placeholder="Visible Name"
            value={formData.visibleName}
            onChange={handleChange}
          />

          <DateOfBirthSelect
            day={formData.dobDay}
            month={formData.dobMonth}
            year={formData.dobYear}
            onChange={handleChange}
          />

          <GenderSelect value={formData.gender} onChange={handleChange} />

          <CountrySelect
            name="nationality"
            value={formData.nationality}
            onChange={handleChange}
            placeholder="Nationality"
          />

          <Input
            name="address"
            placeholder="Address"
            value={formData.address}
            onChange={handleChange}
          />

          <Input
            name="city"
            placeholder="City"
            value={formData.city}
            onChange={handleChange}
          />

          <CountrySelect
            name="country"
            value={formData.country}
            onChange={handleChange}
            placeholder="Country"
          />

          <Input
            name="pincode"
            placeholder="Pincode"
            value={formData.pincode}
            onChange={handleChange}
          />

          <Input
            name="phone"
            placeholder="Phone"
            value={formData.phone}
            onChange={handleChange}
          />

          <Input
            name="whatsapp"
            placeholder="WhatsApp Number"
            value={formData.whatsapp}
            onChange={handleChange}
          />
        </div>

        {/* About */}

        <textarea
          name="aboutMe"
          placeholder="About me"
          value={formData.aboutMe}
          onChange={handleChange}
          className="w-full border rounded-md p-3 text-sm text-gray-600"
          rows={4}
        />

        {/* Media */}

        <TeacherMediaPlaceholder
          profilePhoto={profilePhoto}
          introVideo={introVideo}
          existingProfilePhoto={existingProfilePhoto}
          existingIntroVideo={existingIntroVideo}
          onProfilePhotoChange={handleProfilePhotoChange}
          onIntroVideoChange={handleIntroVideoChange}
          errors={fileErrors}
        />

        {/* Criminal Case */}

        <div className="w-full md:w-1/2">
          <CriminalCaseSelect
            value={formData.criminalCase}
            onChange={handleChange}
          />
        </div>

        {/* Submit */}

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={submitting}
            className="bg-purple-600 hover:bg-purple-700 text-white w-40 rounded-full disabled:opacity-60"
          >
            {submitting ? "Uploading..." : "Next"}
          </Button>
        </div>
      </form>
    </div>
  );
}
