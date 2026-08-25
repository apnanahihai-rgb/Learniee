export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-purple-600 mb-4 border-b pb-2">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{children}</div>
    </div>
  );
}

export function InfoField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase">{label}</p>
      <p className="text-gray-700 mt-1 break-words">
        {value !== null && value !== undefined && value !== "" ? value : "Not provided"}
      </p>
    </div>
  );
}
