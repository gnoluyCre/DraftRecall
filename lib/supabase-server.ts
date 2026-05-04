// input: Supabase service role env vars; output: server Supabase client or null; pos: backend database adapter, update this header and lib/README.md when changed.
import { createClient } from "@supabase/supabase-js";

export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false }
  });
}
