import { Input } from "@/components/ui/input";

interface SignupInputProps {
  placeholder: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  type?: string;
  disabled?: boolean;
  error?: string;
}

export default function SignupInput({
  placeholder,
  value,
  onChange,
  type = "text",
  disabled = false,
  error,
}: SignupInputProps) {
  return (
    <div>
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="rounded-full"
      />

      {error && (
        <p className="text-xs text-red-600 mt-1 ml-3">
          {error}
        </p>
      )}
    </div>
  );
}