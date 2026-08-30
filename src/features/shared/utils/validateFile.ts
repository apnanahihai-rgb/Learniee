/**
 * Generic client-side file validator (type + size), returning an empty
 * string when valid or a user-facing error message otherwise.
 *
 * Was previously duplicated as validateProfilePhoto/validateIntroVideo
 * inside useTeacherStep1Form.ts with only the allowed-types list and
 * copy differing.
 */
export function validateFile(
  file: File | null,
  options: {
    allowedTypes: string[];
    allowedTypesLabel: string;
    maxSizeBytes?: number;
    maxSizeLabel?: string;
  },
): string {
  if (!file) {
    return "";
  }

  const { allowedTypes, allowedTypesLabel, maxSizeBytes = 50 * 1024 * 1024, maxSizeLabel = "50MB" } =
    options;

  if (!allowedTypes.includes(file.type)) {
    return `Only ${allowedTypesLabel} are allowed.`;
  }

  if (file.size > maxSizeBytes) {
    return `File must be under ${maxSizeLabel}.`;
  }

  return "";
}
