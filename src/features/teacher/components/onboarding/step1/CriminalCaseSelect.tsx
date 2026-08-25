"use client";

interface CriminalCaseSelectProps {
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => void;
}

export default function CriminalCaseSelect({
  value,
  onChange,
}: CriminalCaseSelectProps) {
  return (
    <select
      name="criminalCase"
      value={value}
      onChange={onChange}
      className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
    >
      <option value="">
        Criminal Court Case (Optional)
      </option>

      <option value="No">No</option>
      <option value="Yes">Yes</option>
    </select>
  );
}