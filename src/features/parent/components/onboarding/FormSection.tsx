interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * Groups related fields under a small heading, in a responsive 2-column
 * grid (fields collapse to 1 column on mobile). Used to break long onboarding
 * forms into scannable chunks instead of one flat list of inputs.
 */
export default function FormSection({
  title,
  description,
  children,
}: FormSectionProps) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
        {children}
      </div>
    </section>
  );
}
