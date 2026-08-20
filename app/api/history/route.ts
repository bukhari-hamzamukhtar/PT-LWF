import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { HistoryActionType } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES: HistoryActionType[] = ["create", "update", "delete", "restore"];
const RESULT_LIMIT = 300;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type");

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("history_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(RESULT_LIMIT);

    if (typeParam && ALLOWED_TYPES.includes(typeParam as HistoryActionType)) {
      query = query.eq("action_type", typeParam);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch history logs:", error);
      return NextResponse.json({ error: "Couldn't load history from the database." }, { status: 500 });
    }

    return NextResponse.json({ logs: data ?? [] });
  } catch (err) {
    console.error("GET /api/history error:", err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
