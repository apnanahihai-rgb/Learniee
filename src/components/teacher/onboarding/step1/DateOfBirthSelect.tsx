"use client";

interface DateOfBirthSelectProps {
  day: string;
  month: string;
  year: string;
  onChange: (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => void;
}

export default function DateOfBirthSelect({
  day,
  month,
  year,
  onChange,
}: DateOfBirthSelectProps) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: 100 },
    (_, i) => currentYear - i
  );

  return (
    <div className="flex gap-2">
      <select
        name="dobDay"
        value={day}
        onChange={onChange}
        className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
      >
        <option value="">Date</option>

        {days.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      <select
        name="dobMonth"
        value={month}
        onChange={onChange}
        className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
      >
        <option value="">Month</option>

        {months.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>

      <select
        name="dobYear"
        value={year}
        onChange={onChange}
        className="w-full border rounded-md px-3 py-2 text-sm text-gray-600"
      >
        <option value="">Year</option>

        {years.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </div>
  );
}