interface SelectFieldProps {
  name: string;
  value: string;
  placeholder: string;
  options: readonly string[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

/** Plain <select> with a placeholder option, styled to match the app's form inputs. */
export default function SelectField({
  name,
  value,
  placeholder,
  options,
  onChange,
}: SelectFieldProps) {
  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="w-full border rounded-md px-3 py-2 text-sm text-gray-600 bg-white"
    >
      <option value="">{placeholder}</option>

      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
