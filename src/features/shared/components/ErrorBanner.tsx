/**
 * Shared red error box. Extracted from the same
 * `bg-red-100 text-red-700 ...` markup that was duplicated,
 * nearly byte-for-byte, across ~20 Parent/Teacher/Admin pages.
 *
 * `size="default"` matches the most common page-level usage
 * (`p-4 rounded-lg mb-6`). `size="compact"` matches the smaller
 * inline/panel usage (`p-3 rounded-lg text-sm`), with `spacing`
 * controlling whether a bottom margin is applied — some call sites
 * had `mb-4`, others had none, so this keeps every existing layout
 * pixel-identical instead of forcing one spacing choice on all of them.
 */
export default function ErrorBanner({
  children,
  size = "default",
  spacing = true,
  className = "",
}: {
  children: React.ReactNode;
  size?: "default" | "compact";
  spacing?: boolean;
  className?: string;
}) {
  if (!children) return null;

  const sizeClasses =
    size === "compact" ? "p-3 rounded-lg text-sm" : "p-4 rounded-lg";
  const spacingClass = spacing ? (size === "compact" ? "mb-4" : "mb-6") : "";

  return (
    <div
      className={`bg-red-100 text-red-700 ${sizeClasses} ${spacingClass} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
