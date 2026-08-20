import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { HistoryActionType } from "./types";

export interface FieldChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

/**
 * Compares old vs new string values for a set of fields and returns only the
 * ones that actually changed (after trimming). Used so edits only produce
 * audit-log rows for fields a person actually touched.
 */
export function diffFields(
  oldValues: Record<string, string | null>,
  newValues: Record<string, string | null>
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const field of Object.keys(newValues)) {
    const oldValue = (oldValues[field] ?? "").toString().trim();
    const newValue = (newValues[field] ?? "").toString().trim();
    if (oldValue !== newValue) {
      changes.push({
        field,
        oldValue: oldValue === "" ? null : oldValue,
        newValue: newValue === "" ? null : newValue,
      });
    }
  }
  return changes;
}

/** Inserts one history_logs row per changed field. Never throws — logging failures are non-fatal. */
export async function logFieldChanges(
  supabase: SupabaseClient,
  actionType: HistoryActionType,
  lalaId: string,
  lalaName: string | null,
  changes: FieldChange[]
): Promise<void> {
  if (changes.length === 0) return;

  const rows = changes.map((change) => ({
    action_type: actionType,
    lala_id: lalaId,
    lala_name: lalaName,
    field_changed: change.field,
    old_value: change.oldValue,
    new_value: change.newValue,
    details: null,
  }));

  const { error } = await supabase.from("history_logs").insert(rows);
  if (error) {
    console.error("Failed to write history_logs entries:", error);
  }
}

/** Inserts a single freeform history_logs event (used for create / delete / restore). */
export async function logEvent(
  supabase: SupabaseClient,
  actionType: HistoryActionType,
  lalaId: string | null,
  lalaName: string | null,
  details: string | null
): Promise<void> {
  const { error } = await supabase.from("history_logs").insert({
    action_type: actionType,
    lala_id: lalaId,
    lala_name: lalaName,
    field_changed: null,
    old_value: null,
    new_value: null,
    details,
  });
  if (error) {
    console.error("Failed to write history_logs event:", error);
  }
}
