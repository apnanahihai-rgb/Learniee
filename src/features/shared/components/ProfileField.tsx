"use client";

import { Input } from "@/components/ui/input";

/**
 * One label+value row shared by the Parent/Teacher/Admin `/profile`
 * pages — a read-only line in view mode, a controlled input/textarea
 * in edit mode. Kept in `shared/components` rather than duplicated
 * three times, same reasoning as `ErrorBanner`/`CountrySelect`.
 */
export default function ProfileField({
  label,
  value,
  editing,
  name,
  onChange,
  placeholder,
  required = false,
  multiline = false,
}: {
  label: string;
  value: string;
  editing: boolean;
  name: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
        {label}
      </label>

      {!editing ? (
        <p className="text-sm text-gray-800 min-h-[1.5rem]">
          {value || <span className="text-gray-400">Not set</span>}
        </p>
      ) : multiline ? (
        <textarea
          id={name}
          name={name}
          value={value}
          placeholder={placeholder}
          required={required}
          rows={3}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      ) : (
        <Input
          id={name}
          name={name}
          value={value}
          placeholder={placeholder}
          required={required}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )}
    </div>
  );
}
