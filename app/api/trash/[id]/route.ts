import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/history";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** POST restores a trashed entry back into the active list. */
export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing entry id." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchError } = await supabase
    .from("lalas")
    .select("*")
    .eq("id", id)
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to fetch trashed lala:", fetchError);
    return NextResponse.json({ error: "Database error while looking up this entry." }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "This entry isn't in the trash." }, { status: 404 });
  }

  const { data: restored, error: restoreError } = await supabase
    .from("lalas")
    .update({ deleted_at: null })
    .eq("id", id)
    .select()
    .single();

  if (restoreError) {
    console.error("Failed to restore lala:", restoreError);
    return NextResponse.json({ error: "Database error while restoring this entry." }, { status: 500 });
  }

  await logEvent(supabase, "restore", id, restored.name ?? existing.name, "Restored from trash");

  return NextResponse.json({ lala: restored });
}

/** DELETE permanently removes a trashed entry. This cannot be undone. */
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
    .not("deleted_at", "is", null)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to fetch trashed lala before permanent delete:", fetchError);
    return NextResponse.json({ error: "Database error while looking up this entry." }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "This entry isn't in the trash." }, { status: 404 });
  }

  const { error: deleteError } = await supabase.from("lalas").delete().eq("id", id);

  if (deleteError) {
    console.error("Failed to permanently delete lala:", deleteError);
    return NextResponse.json({ error: "Database error while permanently deleting this entry." }, { status: 500 });
  }

  await logEvent(supabase, "delete", null, existing.name, "Permanently deleted from trash");

  return NextResponse.json({ success: true });
}
