"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import CountrySelect from "@/components/common/CountrySelect";

import DateOfBirthSelect from "@/components/teacher/onboarding/step1/DateOfBirthSelect";
import GenderSelect from "@/components/teacher/onboarding/step1/GenderSelect";
import CriminalCaseSelect from "@/components/teacher/onboarding/step1/CriminalCaseSelect";
import TeacherMediaPlaceholder from "@/components/teacher/onboarding/step1/TeacherMediaPlaceholder";

export default function TeacherStep1() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",

    visibleName: "",

    dobDay: "",
    dobMonth: "",
    dobYear: "",

    gender: "",
    nationality: "",

    address: "",
    city: "",
    country: "",
    pincode: "",

    phone: "",
    whatsapp: "",

    aboutMe: "",
    criminalCase: "",
  });

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement |
      HTMLSelectElement |
      HTMLTextAreaElement
    >
  ) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    const res = await fetch(
      "/api/teacher/onboarding/step1",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      }
    );

    if (!res.ok) {
      console.error("Failed to save Step 1");
      return;
    }

    const data = await res.json();

    localStorage.setItem(
      "teacherId",
      data.teacherId
    );

    router.push(
      "/teacher/onboarding/step2"
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-xl shadow-sm border mt-10">

      <h2 className="text-2xl font-bold text-center text-purple-600 mb-8">
        Registration
      </h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >

        {/* Basic Information */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <Input
            name="firstName"
            placeholder="First Name"
            value={formData.firstName}
            onChange={handleChange}
            required
          />

          <Input
            name="lastName"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={handleChange}
            required
          />

          <Input
            name="email"
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <Input
            name="visibleName"
            placeholder="Visible Name"
            value={formData.visibleName}
            onChange={handleChange}
          />

          {/* DOB */}
          <DateOfBirthSelect
            day={formData.dobDay}
            month={formData.dobMonth}
            year={formData.dobYear}
            onChange={handleChange}
          />

          {/* Gender */}
          <GenderSelect
            value={formData.gender}
            onChange={handleChange}
          />

          {/* Nationality */}
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

          {/* Country */}
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

        <TeacherMediaPlaceholder />

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
            className="bg-purple-600 hover:bg-purple-700 text-white w-40 rounded-full"
          >
            Next
          </Button>
        </div>

      </form>
    </div>
  );
}