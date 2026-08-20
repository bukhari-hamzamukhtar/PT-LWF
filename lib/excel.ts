import * as XLSX from "xlsx";
import type { ParsedRow } from "./types";

export const ACCEPTED_FILE_EXTENSIONS = [".xlsx", ".xls", ".csv"];
export const MAX_ROWS_PER_UPLOAD = 5000;

export class SpreadsheetParseError extends Error {}

const NAME_HEADERS = ["name", "full name", "lala name", "lala", "employee name", "staff name"];
const PHONE_HEADERS = [
  "phone number",
  "phone",
  "phone no",
  "phone no.",
  "contact",
  "contact number",
  "contact no",
  "mobile",
  "mobile number",
  "mobile no",
  "cell",
  "cell number",
  "whatsapp",
  "whatsapp number",
];
const CNIC_HEADERS = [
  "cnic",
  "cnic no",
  "cnic no.",
  "cnic number",
  "id card",
  "id card number",
  "national id",
  "nic",
  "identity card",
];

function normalizeHeader(header: string): string {
  return header.toString().trim().toLowerCase().replace(/\s+/g, " ");
}

/** Finds the actual column key in the sheet that best matches one of our target fields. */
function findColumnKey(headers: string[], candidates: string[]): string | null {
  // exact match first
  for (const header of headers) {
    if (candidates.includes(normalizeHeader(header))) return header;
  }
  // fall back to "contains" matching (e.g. "CNIC #" contains "cnic")
  for (const header of headers) {
    const normalized = normalizeHeader(header);
    if (candidates.some((candidate) => normalized.includes(candidate))) return header;
  }
  return null;
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    // Avoid scientific notation / floating point artifacts on large ID-like numbers.
    return Number.isFinite(value) ? value.toString() : "";
  }
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  return value.toString().trim();
}

export function hasAcceptedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ACCEPTED_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Parses an uploaded .xlsx / .xls / .csv file while preserving every column.
 *
 * - Column headers are matched case-insensitively against common variants, so the
 *   file doesn't need to use our exact column names.
 * - Cells that are genuinely empty are kept as empty strings rather than causing the
 *   row to be dropped — only rows where EVERY relevant cell is empty are discarded
 *   (these are almost always trailing blank rows Excel leaves at the end of a sheet).
 */
export async function parseSpreadsheetFile(file: File): Promise<ParsedRow[]> {
  if (!hasAcceptedExtension(file.name)) {
    throw new SpreadsheetParseError(
      "Unsupported file type. Please upload a .xlsx, .xls, or .csv file."
    );
  }

  let workbook: XLSX.WorkBook;
  try {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  } catch {
    throw new SpreadsheetParseError(
      "This file couldn't be read. It may be corrupted or in an unsupported format."
    );
  }

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new SpreadsheetParseError("The file doesn't contain any sheets.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    blankrows: false,
  });

  if (rawRows.length === 0) {
    throw new SpreadsheetParseError("No rows were found in the first sheet of this file.");
  }

  if (rawRows.length > MAX_ROWS_PER_UPLOAD) {
    throw new SpreadsheetParseError(
      `This file has ${rawRows.length} rows. Please split it into batches of ${MAX_ROWS_PER_UPLOAD} or fewer.`
    );
  }

  const headers = Object.keys(rawRows[0]);
  const nameKey = findColumnKey(headers, NAME_HEADERS);
  const phoneKey = findColumnKey(headers, PHONE_HEADERS);
  const cnicKey = findColumnKey(headers, CNIC_HEADERS);

  if (!nameKey && !phoneKey && !cnicKey) {
    throw new SpreadsheetParseError(
      "Couldn't find Name, Phone Number, or CNIC columns in this file. Check the column headers and try again."
    );
  }

  const rows: ParsedRow[] = rawRows.map((raw) => {
    const extra_data: Record<string, string> = {};
    for (const header of headers) {
      if (!header.trim() || header.startsWith("__EMPTY")) continue;
      if (header === nameKey || header === phoneKey || header === cnicKey) continue;
      const value = cellToString(raw[header]);
      if (value !== "") extra_data[header.trim()] = value;
    }

    return {
      name: nameKey ? cellToString(raw[nameKey]) : "",
      phone_number: phoneKey ? cellToString(raw[phoneKey]) : "",
      cnic: cnicKey ? cellToString(raw[cnicKey]) : "",
      extra_data,
    };
  });

  return rows.filter((row) => row.name !== "" || row.phone_number !== "" || row.cnic !== "");
}
