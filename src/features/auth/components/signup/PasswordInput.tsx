import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  placeholder: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  showPassword: boolean;
  onToggle: () => void;
  disabled?: boolean;
  error?: string;
}

export default function PasswordInput({
  placeholder,
  value,
  onChange,
  showPassword,
  onToggle,
  disabled,
  error,
}: PasswordInputProps) {
  return (
    <div>
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="rounded-full pr-10"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff size={18} />
          ) : (
            <Eye size={18} />
          )}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 mt-1 ml-3">
          {error}
        </p>
      )}
    </div>
  );
}