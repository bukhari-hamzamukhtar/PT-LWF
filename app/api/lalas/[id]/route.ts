import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { diffFields, logEvent, logFieldChanges } from "@/lib/history";
import { trimToNull } from "@/lib/normalize";
import { HELP_STATUS_VALUES, type HelpStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface PatchBody {
  name?: string;
  phone_number?: string;
  cnic?: string;
  help_status?: string;
  details?: string;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing entry id." }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const helpStatus = (body.help_status ?? "Pending") as HelpStatus;
  if (!HELP_STATUS_VALUES.includes(helpStatus)) {
    return NextResponse.json(
      { error: `Help Status must be one of: ${HELP_STATUS_VALUES.join(", ")}.` },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from("lalas")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to fetch lala before update:", fetchError);
    return NextResponse.json({ error: "Database error while looking up this entry." }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "This entry no longer exists." }, { status: 404 });
  }

  const newValues = {
    name: trimToNull(body.name) ?? "",
    phone_number: trimToNull(body.phone_number) ?? "",
    cnic: trimToNull(body.cnic) ?? "",
    help_status: helpStatus,
    details: trimToNull(body.details) ?? "",
  };

  const oldValues = {
    name: existing.name ?? "",
    phone_number: existing.phone_number ?? "",
    cnic: existing.cnic ?? "",
    help_status: existing.help_status ?? "",
    details: existing.details ?? "",
  };

  const changes = diffFields(oldValues, newValues);

  const { data: updated, error: updateError } = await supabase
    .from("lalas")
    .update({
      name: trimToNull(body.name),
      phone_number: trimToNull(body.phone_number),
      cnic: trimToNull(body.cnic),
      help_status: helpStatus,
      details: trimToNull(body.details),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error("Failed to update lala:", updateError);
    return NextResponse.json({ error: "Database error while saving your changes." }, { status: 500 });
  }

  await logFieldChanges(supabase, "update", id, updated.name ?? existing.name, changes);

  return NextResponse.json({ lala: updated });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing entry id." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from("lalas")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to fetch lala before delete:", fetchError);
    return NextResponse.json({ error: "Database error while looking up this entry." }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "This entry no longer exists or was already moved to trash." }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("lalas")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (deleteError) {
    console.error("Failed to soft-delete lala:", deleteError);
    return NextResponse.json({ error: "Database error while moving this entry to trash." }, { status: 500 });
  }

  await logEvent(supabase, "delete", id, existing.name, "Moved to trash");

  return NextResponse.json({ success: true });
}
