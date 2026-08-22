import { SignupRole } from "@/types/signup";

interface RoleSelectorProps {
  role: SignupRole;
  onChange: (role: SignupRole) => void;
  disabled?: boolean;
}

const PRIMARY = "#7E2BF1";

export default function RoleSelector({
  role,
  onChange,
  disabled,
}: RoleSelectorProps) {
  return (
    <div className="flex mb-6 border rounded-full overflow-hidden">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("parent")}
        className="flex-1 py-2 font-medium"
        style={{
          backgroundColor:
            role === "parent" ? PRIMARY : "#F3F4F6",
          color: role === "parent" ? "white" : "#4B5563",
        }}
      >
        Parent
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("teacher")}
        className="flex-1 py-2 font-medium"
        style={{
          backgroundColor:
            role === "teacher" ? PRIMARY : "#F3F4F6",
          color: role === "teacher" ? "white" : "#4B5563",
        }}
      >
        Teacher
      </button>
    </div>
  );
}