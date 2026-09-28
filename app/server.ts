import { createClient } from "@supabase/supabase-js";

// Côté serveur seulement : la clé secrète contourne les règles d'accès, elle ne sort jamais du serveur.
export function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
}

// Retrouve le compte à partir du jeton envoyé par le navigateur. Null si le jeton est faux ou expiré.
export async function userFrom(token: string) {
  if (!token) return null;
  const { data } = await admin().auth.getUser(token);
  return data.user ?? null;
}
