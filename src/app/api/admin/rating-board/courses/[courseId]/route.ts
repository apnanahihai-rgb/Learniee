import { deleteCourseAsAdmin } from "@/features/admin/server/ratingRemoval.service";
import { handleRemoval } from "@/features/admin/server/removalRoute";

/** DELETE { reason } — Admin deletes one course. Refused while it has live enrollments or open payouts. */
export async function DELETE(req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;

  return handleRemoval(
    req,
    async ({ reason, admin }) => {
      await deleteCourseAsAdmin({ courseId, reason, admin });
    },
    "Failed to delete this course.",
  );
}
