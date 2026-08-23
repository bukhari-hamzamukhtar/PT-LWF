import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { diffFields, type FieldChange } from "@/lib/history";
import { trimToNull } from "@/lib/normalize";
import type { Lala, ParsedRow, UploadConflict, DuplicateResolution } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ResolveAllRequestBody {
  conflicts: UploadConflict[];
  action: DuplicateResolution;
}

function cleanRow(row: ParsedRow): ParsedRow {
  return {
    name: (row?.name ?? "").toString().trim(),
    phone_number: (row?.phone_number ?? "").toString().trim(),
    cnic: (row?.cnic ?? "").toString().trim(),
    extra_data: Object.fromEntries(
      Object.entries(row?.extra_data ?? {})
        .map(([key, value]) => [key.trim(), value.toString().trim()] as const)
        .filter(([, value]) => value !== "")
    ),
  };
}

function resolveExtraData(existing: Record<string, string> | null | undefined, incoming: Record<string, string>) {
  const result = { ...(existing ?? {}) };
  for (const [key, value] of Object.entries(incoming)) {
    if (value !== "") result[key] = value;
  }
  return result;
}

async function processBatch(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  conflicts: UploadConflict[]
): Promise<{ changes: Array<{ id: string; name: string | null; fields: FieldChange[] }> }> {
  const ids = conflicts.map((conflict) => conflict.existing.id);
  const { data: currentRows, error: fetchError } = await supabase
    .from("lalas")
    .select("*")
    .in("id", ids)
    .is("deleted_at", null);

  if (fetchError) throw new Error("Database error while looking up duplicate records.");

  const currentById = new Map((currentRows as Lala[]).map((lala) => [lala.id, lala]));
  const updates: Array<{ id: string; update: Record<string, unknown>; fields: FieldChange[]; name: string | null }> = [];

  for (const conflict of conflicts) {
    const existing = currentById.get(conflict.existing.id);
    if (!existing) throw new Error("One of the duplicate records no longer exists.");

    const incoming = cleanRow(conflict.row);
    const extraData = resolveExtraData(existing.extra_data, incoming.extra_data);
    const oldValues = {
      name: existing.name ?? "",
      phone_number: existing.phone_number ?? "",
      cnic: existing.cnic ?? "",
      extra_data: JSON.stringify(existing.extra_data ?? {}),
    };
    const newValues = {
      name: incoming.name || existing.name || "",
      phone_number: incoming.phone_number || existing.phone_number || "",
      cnic: incoming.cnic || existing.cnic || "",
      extra_data: JSON.stringify(extraData),
    };
    const fields = diffFields(oldValues, newValues);

    if (fields.length > 0) {
      updates.push({
        id: existing.id,
        name: newValues.name || null,
        fields,
        update: {
          name: trimToNull(newValues.name),
          phone_number: trimToNull(newValues.phone_number),
          cnic: trimToNull(newValues.cnic),
          extra_data: extraData,
        },
      });
    }
  }

  const results: Array<{ id: string; name: string | null; fields: FieldChange[] }> = [];
  for (const update of updates) {
    const { data, error } = await supabase
      .from("lalas")
      .update(update.update)
      .eq("id", update.id)
      .select("id, name")
      .single();
    if (error || !data) throw new Error("Database error while saving duplicate records.");
    results.push({ id: data.id, name: data.name, fields: update.fields });
  }

  return { changes: results };
}

export async function POST(request: Request) {
  let body: ResolveAllRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const conflicts = Array.isArray(body?.conflicts) ? body.conflicts : [];
  if (conflicts.length === 0 || body.action !== "discard" && body.action !== "overwrite_merge") {
    return NextResponse.json({ error: "Missing or invalid duplicate resolution request." }, { status: 400 });
  }

  if (body.action === "discard") {
    return NextResponse.json({ resolvedCount: conflicts.length, updatedCount: 0 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const allChanges: Array<{ id: string; name: string | null; fields: FieldChange[] }> = [];
    const batchSize = 25;

    for (let index = 0; index < conflicts.length; index += batchSize) {
      const result = await processBatch(supabase, conflicts.slice(index, index + batchSize));
      allChanges.push(...result.changes);
    }

    const historyRows = allChanges.flatMap((change) =>
      change.fields.map((field) => ({
        action_type: "update" as const,
        lala_id: change.id,
        lala_name: change.name,
        field_changed: field.field,
        old_value: field.oldValue,
        new_value: field.newValue,
        details: "Updated via bulk duplicate resolution",
      }))
    );

    if (historyRows.length > 0) {
      const { error: historyError } = await supabase.from("history_logs").insert(historyRows);
      if (historyError) console.error("Failed to write bulk duplicate history:", historyError);
    }

    return NextResponse.json({ resolvedCount: conflicts.length, updatedCount: allChanges.length });
  } catch (error) {
    console.error("Bulk duplicate resolution failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve duplicates." },
      { status: 500 }
    );
  }
}
