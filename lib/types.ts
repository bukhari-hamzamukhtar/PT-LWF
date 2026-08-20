export type HelpStatus = "Yes" | "No" | "Pending";

export const HELP_STATUS_VALUES: HelpStatus[] = ["Yes", "No", "Pending"];

export interface Lala {
  id: string;
  name: string | null;
  phone_number: string | null;
  cnic: string | null;
  help_status: HelpStatus;
  details: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type HistoryActionType = "create" | "update" | "delete" | "restore";

export interface HistoryLog {
  id: string;
  action_type: HistoryActionType;
  lala_id: string | null;
  lala_name: string | null;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  details: string | null;
  created_at: string;
}

/** A single row parsed out of an uploaded Excel / CSV file. */
export interface ParsedRow {
  name: string;
  phone_number: string;
  cnic: string;
}

export type ConflictMatch = "cnic" | "phone_number" | "both";

export interface UploadConflict {
  row: ParsedRow;
  existing: Lala;
  matchedOn: ConflictMatch;
}

export type DuplicateResolution = "overwrite" | "keep_original" | "merge";

export interface EditableFields {
  name: string;
  phone_number: string;
  cnic: string;
  help_status: HelpStatus;
  details: string;
}

export type SortMode = "recent" | "alphabetical";
export type StatusFilter = "all" | "Yes" | "Pending" | "No";
