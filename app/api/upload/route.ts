import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeForMatch, trimToNull } from "@/lib/normalize";
import type { ConflictMatch, Lala, ParsedRow } from "@/lib/types";
import { MAX_ROWS_PER_UPLOAD } from "@/lib/excel";

export const dynamic = "force-dynamic";

interface UploadRequestBody {
  rows: ParsedRow[];
  fileName?: string;
}

interface ConflictResponse {
  row: ParsedRow;
  matchedOn: ConflictMatch;
  existing: Lala;
}

function cleanRow(raw: ParsedRow): ParsedRow {
  return {
    name: (raw?.name ?? "").toString().trim(),
    phone_number: (raw?.phone_number ?? "").toString().trim(),
    cnic: (raw?.cnic ?? "").toString().trim(),
  };
}

export async function POST(request: Request) {
  let body: UploadRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const incomingRows = Array.isArray(body?.rows) ? body.rows : [];

  if (incomingRows.length === 0) {
    return NextResponse.json({ error: "No rows were provided." }, { status: 400 });
  }
  if (incomingRows.length > MAX_ROWS_PER_UPLOAD) {
    return NextResponse.json(
      { error: `Too many rows. Please upload ${MAX_ROWS_PER_UPLOAD} or fewer at a time.` },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // Step 1: dedupe *within this file* first. If the same CNIC/phone appears more
  // than once in the same upload, merge those rows together (first occurrence
  // wins, later rows only fill in gaps) rather than treating them as a
  // duplicate-vs-database conflict, since there's no existing DB record to
  // reconcile against yet.
  const dedupedRows: ParsedRow[] = [];
  const cnicIndexInBatch = new Map<string, number>();
  const phoneIndexInBatch = new Map<string, number>();

  for (const raw of incomingRows) {
    const row = cleanRow(raw);
    if (!row.name && !row.phone_number && !row.cnic) continue; // fully blank row

    const normalizedCnic = normalizeForMatch(row.cnic);
    const normalizedPhone = normalizeForMatch(row.phone_number);

    let matchIndex: number | undefined;
    if (normalizedCnic && cnicIndexInBatch.has(normalizedCnic)) {
      matchIndex = cnicIndexInBatch.get(normalizedCnic);
    } else if (normalizedPhone && phoneIndexInBatch.has(normalizedPhone)) {
      matchIndex = phoneIndexInBatch.get(normalizedPhone);
    }

    if (matchIndex !== undefined) {
      const target = dedupedRows[matchIndex];
      target.name = target.name || row.name;
      target.phone_number = target.phone_number || row.phone_number;
      target.cnic = target.cnic || row.cnic;
    } else {
      const newIndex = dedupedRows.length;
      dedupedRows.push(row);
      if (normalizedCnic) cnicIndexInBatch.set(normalizedCnic, newIndex);
      if (normalizedPhone) phoneIndexInBatch.set(normalizedPhone, newIndex);
    }
  }

  if (dedupedRows.length === 0) {
    return NextResponse.json({ error: "Every row in this file was empty." }, { status: 400 });
  }

  // Step 2: check each deduped row against every existing (non-deleted) record.
  const { data: existingLalas, error: fetchError } = await supabase
    .from("lalas")
    .select("*")
    .is("deleted_at", null);

  if (fetchError) {
    console.error("Failed to fetch existing lalas for duplicate check:", fetchError);
    return NextResponse.json({ error: "Database error while checking for duplicates." }, { status: 500 });
  }

  const cnicMap = new Map<string, Lala>();
  const phoneMap = new Map<string, Lala>();
  for (const lala of (existingLalas ?? []) as Lala[]) {
    const normalizedCnic = normalizeForMatch(lala.cnic);
    const normalizedPhone = normalizeForMatch(lala.phone_number);
    if (normalizedCnic) cnicMap.set(normalizedCnic, lala);
    if (normalizedPhone) phoneMap.set(normalizedPhone, lala);
  }

  const cleanRows: ParsedRow[] = [];
  const conflicts: ConflictResponse[] = [];

  for (const row of dedupedRows) {
    const normalizedCnic = normalizeForMatch(row.cnic);
    const normalizedPhone = normalizeForMatch(row.phone_number);

    const existingByCnic = normalizedCnic ? cnicMap.get(normalizedCnic) : undefined;
    const existingByPhone = normalizedPhone ? phoneMap.get(normalizedPhone) : undefined;
    const existing = existingByCnic ?? existingByPhone;

    if (existing) {
      let matchedOn: ConflictMatch = "cnic";
      if (existingByCnic && existingByPhone && existingByCnic.id === existingByPhone.id) {
        matchedOn = "both";
      } else if (!existingByCnic && existingByPhone) {
        matchedOn = "phone_number";
      }
      conflicts.push({ row, matchedOn, existing });
      continue;
    }

    cleanRows.push(row);
  }

  // Step 3: insert everything that didn't conflict with anything already in the database.
  let insertedCount = 0;
  if (cleanRows.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from("lalas")
      .insert(
        cleanRows.map((row) => ({
          name: trimToNull(row.name),
          phone_number: trimToNull(row.phone_number),
          cnic: trimToNull(row.cnic),
          help_status: "Pending",
          details: null,
        }))
      )
      .select();

    if (insertError) {
      console.error("Failed to insert new lalas:", insertError);
      return NextResponse.json({ error: "Database error while adding new entries." }, { status: 500 });
    }

    insertedCount = inserted?.length ?? 0;

    if (inserted && inserted.length > 0) {
      const sourceLabel = body.fileName ? `Added via upload of "${body.fileName}"` : "Added via file upload";
      const historyRows = inserted.map((lala) => ({
        action_type: "create" as const,
        lala_id: lala.id,
        lala_name: lala.name,
        field_changed: null,
        old_value: null,
        new_value: null,
        details: sourceLabel,
      }));
      const { error: historyError } = await supabase.from("history_logs").insert(historyRows);
      if (historyError) {
        console.error("Failed to write history logs for upload:", historyError);
      }
    }
  }

  return NextResponse.json({ insertedCount, conflicts });
}
