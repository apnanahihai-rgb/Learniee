import type { AdminTeacher } from "@/features/admin/types/teacher";
import TeacherPersonalSection from "@/features/admin/components/TeacherPersonalSection";
import TeacherProfessionalSection from "@/features/admin/components/TeacherProfessionalSection";
import TeacherDocumentsStatusSection from "@/features/admin/components/TeacherDocumentsStatusSection";

interface Props {
  teacher: AdminTeacher;
  onApprove: (teacherId: string) => void;
  onReject: (teacherId: string) => void;
}

const statusStyles: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function TeacherApprovalCard({ teacher, onApprove, onReject }: Props) {
  return (
    <div className="bg-white border rounded-2xl shadow-sm p-8">
      {/* HEADER */}
      <div className="flex justify-between items-start border-b pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {teacher.firstName} {teacher.lastName}
          </h2>

          <p className="text-gray-500">{teacher.email}</p>

          {teacher.visibleName && (
            <p className="text-sm text-gray-400 mt-1">Visible name: {teacher.visibleName}</p>
          )}
        </div>

        <span
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            statusStyles[teacher.approvalStatus] ?? statusStyles.REJECTED
          }`}
        >
          {teacher.approvalStatus}
        </span>
      </div>

      <TeacherPersonalSection teacher={teacher} />
      <TeacherProfessionalSection teacher={teacher} />
      <TeacherDocumentsStatusSection teacher={teacher} />

      {/* ACTIONS */}
      <div className="flex gap-4 mt-8 pt-6 border-t">
        <button
          onClick={() => onApprove(teacher.id)}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
        >
          Approve
        </button>

        <button
          onClick={() => onReject(teacher.id)}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
