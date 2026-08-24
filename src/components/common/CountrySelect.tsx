"use client";

import { getData } from "country-list"

interface CountrySelectProps {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
  required?: boolean;
}

export default function CountrySelect({
  name,
  value,
  onChange,
  placeholder = "Select country",
  required = false,
}: CountrySelectProps) {
  const countries = getData().sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
    >
      <option value="">{placeholder}</option>

      {countries.map((country) => (
        <option key={country.code} value={country.name}>
          {country.name}
        </option>
      ))}
    </select>
  );
}