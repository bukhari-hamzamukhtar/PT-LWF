import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Cheap, unauthenticated read against the database. Ping this endpoint once
 * a day (e.g. with cron-job.org, UptimeRobot, or a GitHub Actions scheduled
 * workflow) so Supabase's free tier doesn't pause the project from
 * inactivity.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { error, count } = await supabase
      .from("lalas")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("Keep-alive query failed:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      rowCount: count ?? 0,
    });
  } catch (err) {
    console.error("Keep-alive route error:", err);
    return NextResponse.json({ ok: false, error: "Unexpected error" }, { status: 500 });
  }
}
