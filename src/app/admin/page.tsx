"use client";

import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-8 py-5">
        <h1 className="text-2xl font-bold text-purple-600">
          Learniee Admin Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage teachers, courses and approvals
        </p>
      </header>

      <main className="p-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800">
            Welcome, Admin 👋
          </h2>
          <p className="text-gray-500 mt-1">
            Manage the Learniee platform from here.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Teacher Approvals
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Review teachers waiting for approval.
            </p>
            <button
              onClick={() => router.push("/admin/teachers")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              View Teachers
            </button>
          </div>
    
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Course Approvals
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Review courses submitted by teachers.
            </p>
            <button
              onClick={() => router.push("/admin/courses")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              View Courses
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Enrollment Approvals
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Review enrollments the teacher has already approved.
            </p>
            <button
              onClick={() => router.push("/admin/enrollments")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              View Enrollments
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Chat Monitor
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              View any parent ↔ teacher conversation, read-only.
            </p>
            <button
              onClick={() => router.push("/admin/chat")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              View Chats
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Manage Users
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Delete a parent or teacher account completely.
            </p>
            <button
              onClick={() => router.push("/admin/users")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              Manage Users
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Staff Accounts
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Create and manage HR / Accounts logins.
            </p>
            <button
              onClick={() => router.push("/admin/staff-accounts")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              Manage Staff Accounts
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Accounts
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Export transactions and sessions as Excel.
            </p>
            <button
              onClick={() => router.push("/admin/accounts")}
              className="mt-5 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg"
            >
              View Accounts
            </button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">
              Platform
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Manage Learniee platform information.
            </p>
            <button
              className="mt-5 bg-gray-200 text-gray-500 px-5 py-2 rounded-lg cursor-not-allowed"
              disabled
            >
              Coming Soon
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}