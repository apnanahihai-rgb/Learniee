"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function TeacherStep3() {
  const router = useRouter();

  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [panCardNumber, setPanCardNumber] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("teacherId");

    if (!id) {
      router.push("/teacher/onboarding/step1");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTeacherId(id);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!teacherId) {
      alert("Teacher ID is missing.");
      return;
    }

    try {
      const res = await fetch("/api/teacher/onboarding/step3", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teacherId,
          panCardNumber,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error(data);
        alert("Failed to save documents.");
        return;
      }

      localStorage.removeItem("teacherId");

      router.push("/teacher/pending-approval");
    } catch (error) {
      console.error("Step 3 submission error:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white rounded-xl shadow-sm border mt-10">
      <h2 className="text-2xl font-bold text-center text-purple-600 mb-8">
        Documents
      </h2>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Date of Birth Proof */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Date of Birth Proof
          </label>

          <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
            <p>Drag files or upload</p>

            <p className="text-xs mt-2">
              Max file size: 50MB | Supported: PNG, JPG, PDF
            </p>

            <p className="text-xs text-purple-600 mt-2 font-semibold">
              S3 integration later
            </p>
          </div>
        </div>

        {/* Address Proof */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Address Proof
          </label>

          <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
            <p>Drag files or upload</p>

            <p className="text-xs mt-2">
              Max file size: 50MB | Supported: PNG, JPG, PDF
            </p>

            <p className="text-xs text-purple-600 mt-2 font-semibold">
              S3 integration later
            </p>
          </div>
        </div>

        {/* Qualification */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Qualification / Course Certification
          </label>

          <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
            <p>Drag files or upload</p>

            <p className="text-xs mt-2">
              Max file size: 50MB | Supported: PNG, JPG, PDF
            </p>

            <p className="text-xs text-purple-600 mt-2 font-semibold">
              S3 integration later
            </p>
          </div>
        </div>

        {/* PAN Card */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            PAN Card Number
          </label>

          <Input
            name="panCardNumber"
            placeholder="Enter PAN card number"
            value={panCardNumber}
            onChange={(e) =>
              setPanCardNumber(e.target.value.toUpperCase())
            }
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-center gap-4 pt-6">
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
            Submit
          </Button>
        </div>
      </form>
    </div>
  );
}