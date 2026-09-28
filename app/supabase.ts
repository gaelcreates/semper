"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Client Supabase du navigateur : la session vit dans le navigateur, la connexion se fait par code reçu par e-mail.
let client: SupabaseClient | null = null;
export function sb() {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return client;
}
export const sbReady = () => !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
