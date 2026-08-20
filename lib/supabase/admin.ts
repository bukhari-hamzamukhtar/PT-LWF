import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client, authenticated with the service_role key.
 *
 * This file must NEVER be imported from a Client Component. The
 * `server-only` import above makes that a build-time error if it ever
 * happens by accident.
 *
 * The service_role key bypasses Row Level Security entirely, which is why
 * every route that uses this client is protected by the password-gate
 * middleware first (see middleware.ts) — this client is the only thing in
 * the app that ever talks to Supabase, and the browser never sees the
 * service_role key or the Supabase URL.
 */

let cachedClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "Missing SUPABASE_URL environment variable. Set it in .env.local (development) or your Vercel project's Environment Variables (production)."
    );
  }
  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Set it in .env.local (development) or your Vercel project's Environment Variables (production)."
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: "public",
    },
  });

  return cachedClient;
}
