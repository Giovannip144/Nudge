import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in Client Components and browser context.
 * Uses the public anon key — safe to expose to the browser.
 * RLS policies enforce data access at the database level.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
