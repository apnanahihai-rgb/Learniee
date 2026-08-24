"use client";

import { useRouter } from "next/navigation";

export default function TeacherPendingApproval() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-sm border p-10 text-center">

        {/* Icon */}
        <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
          <span className="text-4xl">⏳</span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-purple-600">
          Registration Submitted
        </h1>

        {/* Message */}
        <p className="text-gray-600 mt-4 leading-7">
          Thank you for completing your teacher registration.
          Your profile has been successfully submitted and is
          currently waiting for admin approval.
        </p>

        {/* Status */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">
            Application Status
          </p>

          <p className="text-lg font-semibold text-yellow-700 mt-1">
            PENDING APPROVAL
          </p>
        </div>

        {/* Information */}
        <div className="mt-6 text-sm text-gray-500">
          <p>
            Our admin team will review your profile and documents.
          </p>

          <p className="mt-2">
            Once your application is approved, you will be able
            to access your teacher dashboard and create courses.
          </p>
        </div>

        {/* Button */}
        <button
          onClick={() => router.push("/login")}
          className="mt-8 bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full font-medium transition"
        >
          Back to Login
        </button>

      </div>
    </div>
  );
}