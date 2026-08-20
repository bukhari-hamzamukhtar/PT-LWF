import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { SESSION_COOKIE_NAME, isValidSessionToken } from "@/lib/session";
import type { Lala } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Middleware already enforces this, but a Server Component check is kept
  // here too as a defensive fallback in case this page is ever reached in a
  // way that bypasses middleware (e.g. certain test/runtime setups).
  const cookieStore = await cookies();
  const authenticated = await isValidSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!authenticated) {
    redirect("/login");
  }

  let initialLalas: Lala[] = [];
  let initialError: string | null = null;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("lalas")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      initialError = error.message;
    } else {
      initialLalas = data ?? [];
    }
  } catch (err) {
    initialError = err instanceof Error ? err.message : "Failed to connect to the database.";
  }

  return <Dashboard initialLalas={initialLalas} initialError={initialError} />;
}
