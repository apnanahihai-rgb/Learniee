"use client";

interface PasswordInputProps {
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  showPassword: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export default function PasswordInput({
  value,
  onChange,
  showPassword,
  onToggle,
  disabled = false,
}: PasswordInputProps) {
  return (
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        placeholder="Password"
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full rounded-full border border-gray-200 px-4 py-3 pr-16 outline-none focus:border-violet-500 disabled:bg-gray-100"
      />

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500"
      >
        {showPassword ? "Hide" : "Show"}
      </button>
    </div>
  );
}