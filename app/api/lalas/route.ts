import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("lalas")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch lalas:", error);
      return NextResponse.json({ error: "Couldn't load data from the database." }, { status: 500 });
    }

    return NextResponse.json({ lalas: data ?? [] });
  } catch (err) {
    console.error("GET /api/lalas error:", err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
