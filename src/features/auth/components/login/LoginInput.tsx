"use client";

interface LoginInputProps {
  type?: "text" | "email";
  placeholder: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  disabled?: boolean;
}

export default function LoginInput({
  type = "text",
  placeholder,
  value,
  onChange,
  disabled = false,
}: LoginInputProps) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full rounded-full border border-gray-200 px-4 py-3 outline-none focus:border-violet-500 disabled:bg-gray-100"
    />
  );
}