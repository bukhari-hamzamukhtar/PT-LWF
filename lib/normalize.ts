/**
 * Normalizes a CNIC or phone number for comparison purposes only.
 * Strips everything except letters/digits and lowercases the result, so that
 * formatting differences ("0300-1234567" vs "0300 1234567" vs "03001234567")
 * don't cause two records for the same person to be treated as different.
 *
 * The ORIGINAL, human-entered value is always what gets stored/displayed —
 * this function is only ever used to decide whether two entries match.
 */
export function normalizeForMatch(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function trimToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.toString().trim();
  return trimmed === "" ? null : trimmed;
}

export function safeTrim(value: string | null | undefined): string {
  return (value ?? "").toString().trim();
}
