interface Props {
  src?: string | null;
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<Props["size"]>, string> = {
  xs: "w-8 h-8 text-xs",
  sm: "w-10 h-10 text-sm",
  md: "w-16 h-16 text-xl",
  lg: "w-24 h-24 text-2xl",
};

const RING_CLASSES: Record<NonNullable<Props["size"]>, string> = {
  xs: "ring-2 ring-white",
  sm: "ring-2 ring-white",
  md: "ring-4 ring-white",
  lg: "ring-4 ring-white",
};

/**
 * Circular child avatar with a violet gradient + initial fallback
 * when there's no photo yet. Shared by the "add child" form and
 * the child profile page so the two don't drift into two different
 * "no photo" treatments.
 */
export default function ChildAvatar({ src, name, size = "md", className = "" }: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={`${SIZE_CLASSES[size]} rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold shadow-sm ${RING_CLASSES[size]} ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
