"use client";

import PhoneInputComponent from "react-phone-number-input";
import type { Value } from "react-phone-number-input";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export default function PhoneInput({
  value,
  onChange,
  error,
}: PhoneInputProps) {
  function handleChange(phone: Value) {
    onChange(phone || "");
  }

  return (
    <div>
      <PhoneInputComponent
        international
        defaultCountry="IN"
        countryCallingCodeEditable={false}
        withCountryCallingCode
        value={value}
        onChange={handleChange}
        placeholder="Phone number"
        className="phone-input"
      />

      {error && (
        <p className="text-red-600 text-sm mt-1">
          {error}
        </p>
      )}
    </div>
  );
}