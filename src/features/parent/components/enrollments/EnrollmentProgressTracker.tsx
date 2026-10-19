import { Check } from "lucide-react";

/**
 * Status tracker for an enrollment that has been paid but isn't running
 * yet: "Paid → Approval → Classes ready", with one plain line saying
 * what happens next.
 *
 * Deliberately 3 steps, not "Paid → Teacher → Admin → Classes ready":
 * Parent-facing copy never names Admin (see `enrollmentStatus.ts`), so
 * the teacher review and the final check read as one "Approval" step.
 */
interface Props {
  status: string;
}

const STEPS = ["Payment received", "Approval", "Classes ready"] as const;

function describe(status: string): { current: number; line: string } | null {
  switch (status) {
    case "PENDING_APPROVAL":
    case "PENDING_TEACHER_APPROVAL":
    case "PENDING_ADMIN_APPROVAL":
      return {
        current: 1,
        line: "Your teacher is reviewing the schedule. We'll notify you as soon as your classes are ready.",
      };
    case "PENDING_PARENT_RECONFIRMATION":
      return {
        current: 1,
        line: "Your teacher suggested a change — confirm it below to move things along.",
      };
    default:
      return null;
  }
}

export default function EnrollmentProgressTracker({ status }: Props) {
  const info = describe(status);

  if (!info) return null;

  return (
    <div className="mt-4" aria-label="Enrollment progress">
      <ol className="flex items-center">
        {STEPS.map((label, index) => {
          const done = index < info.current;
          const active = index === info.current;

          return (
            <li key={label} className="flex items-center flex-1 last:flex-none">
              <span className="flex flex-col items-center gap-1">
                <span
                  aria-current={active ? "step" : undefined}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    done
                      ? "bg-green-500 text-white"
                      : active
                        ? "bg-brand text-white ring-4 ring-brand/15"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {done ? <Check size={13} /> : index + 1}
                </span>
                <span
                  className={`text-[10px] font-semibold text-center leading-tight ${
                    done || active ? "text-gray-700" : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
              </span>

              {index < STEPS.length - 1 && (
                <span
                  className={`flex-1 h-0.5 mx-2 mb-4 rounded-full ${
                    done ? "bg-green-400" : "bg-gray-200"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>

      <p className="text-xs text-gray-500 mt-3">{info.line}</p>
    </div>
  );
}
