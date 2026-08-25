"use client";

interface GenderSelectProps {
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => void;
}

export default function GenderSelect({
  value,
  onChange,
}: GenderSelectProps) {
  return (
    <select
      name="gender"
      value={value}
      onChange={onChange}
      className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
    >
      <option value="">Gender</option>
      <option value="Male">Male</option>
      <option value="Female">Female</option>
      <option value="Other">Other</option>
      <option value="Prefer not to say">
        Prefer not to say
      </option>
    </select>
  );
}