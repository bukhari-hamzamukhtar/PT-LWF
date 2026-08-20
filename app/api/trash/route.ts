import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("lalas")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch trash:", error);
      return NextResponse.json({ error: "Couldn't load the trash bin from the database." }, { status: 500 });
    }

    return NextResponse.json({ lalas: data ?? [] });
  } catch (err) {
    console.error("GET /api/trash error:", err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
