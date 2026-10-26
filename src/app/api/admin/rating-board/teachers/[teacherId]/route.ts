import { deleteTeacherAsAdmin } from "@/features/admin/server/ratingRemoval.service";
import { handleRemoval } from "@/features/admin/server/removalRoute";

/** DELETE { reason } — Admin deletes a teacher account. Refused while they have live enrollments or open payouts. */
export async function DELETE(req: Request, { params }: { params: Promise<{ teacherId: string }> }) {
  const { teacherId } = await params;

  return handleRemoval(
    req,
    async ({ reason, admin }) => deleteTeacherAsAdmin({ teacherId, reason, admin }),
    "Failed to delete this teacher.",
  );
}
