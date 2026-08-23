import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { diffFields, logFieldChanges } from "@/lib/history";
import { trimToNull } from "@/lib/normalize";
import type { ParsedRow } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ResolveRequestBody {
  existingId: string;
  row: ParsedRow;
  action: "overwrite" | "keep_original" | "merge";
}

const VALID_ACTIONS: ResolveRequestBody["action"][] = ["overwrite", "keep_original", "merge"];

/** Field-level merge rule shared by "overwrite" and "merge". */
function resolveField(action: "overwrite" | "merge", existingValue: string, newValue: string): string {
  if (action === "overwrite") {
    // The incoming value wins wherever it was actually provided; a blank cell
    // in the upload never erases data that already exists.
    return newValue !== "" ? newValue : existingValue;
  }
  // merge: whatever is already on file wins; the incoming value only fills a gap.
  return existingValue !== "" ? existingValue : newValue;
}

function resolveExtraData(
  action: "overwrite" | "merge",
  existing: Record<string, string> | null | undefined,
  incoming: Record<string, string>
) {
  const keys = new Set([...Object.keys(existing ?? {}), ...Object.keys(incoming)]);
  const result: Record<string, string> = {};
  for (const key of keys) {
    const value = resolveField(action, existing?.[key] ?? "", incoming[key] ?? "");
    if (value !== "") result[key] = value;
  }
  return result;
}

export async function POST(request: Request) {
  let body: ResolveRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { existingId, row, action } = body ?? {};

  if (!existingId || !row || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Missing or invalid fields in request." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from("lalas")
    .select("*")
    .eq("id", existingId)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to fetch existing lala during resolve:", fetchError);
    return NextResponse.json({ error: "Database error while looking up this entry." }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json(
      { error: "That entry no longer exists — it may have been deleted or edited by someone else." },
      { status: 404 }
    );
  }

  if (action === "keep_original") {
    // Nothing to change; the incoming row is discarded and no audit entry is needed
    // since no data actually changed.
    return NextResponse.json({ lala: existing, action });
  }

  const incoming: ParsedRow = {
    name: (row.name ?? "").toString().trim(),
    phone_number: (row.phone_number ?? "").toString().trim(),
    cnic: (row.cnic ?? "").toString().trim(),
    extra_data: row.extra_data ?? {},
  };

  const newValues = {
    name: resolveField(action, existing.name ?? "", incoming.name),
    phone_number: resolveField(action, existing.phone_number ?? "", incoming.phone_number),
    cnic: resolveField(action, existing.cnic ?? "", incoming.cnic),
    extra_data: resolveExtraData(action, existing.extra_data, incoming.extra_data),
  };

  const oldValues = {
    name: existing.name ?? "",
    phone_number: existing.phone_number ?? "",
    cnic: existing.cnic ?? "",
    extra_data: JSON.stringify(existing.extra_data ?? {}),
  };

  const changes = diffFields(oldValues, {
    ...newValues,
    extra_data: JSON.stringify(newValues.extra_data),
  });

  if (changes.length === 0) {
    return NextResponse.json({ lala: existing, action });
  }

  const { data: updated, error: updateError } = await supabase
    .from("lalas")
    .update({
      name: trimToNull(newValues.name),
      phone_number: trimToNull(newValues.phone_number),
      cnic: trimToNull(newValues.cnic),
      extra_data: newValues.extra_data,
    })
    .eq("id", existingId)
    .select()
    .single();

  if (updateError) {
    console.error("Failed to update lala during resolve:", updateError);
    return NextResponse.json({ error: "Database error while saving this entry." }, { status: 500 });
  }

  await logFieldChanges(supabase, "update", existingId, updated.name ?? existing.name, changes);

  return NextResponse.json({ lala: updated, action });
}
