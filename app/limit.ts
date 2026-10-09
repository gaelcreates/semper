import { createHash } from "crypto";
import { headers } from "next/headers";
import { admin } from "./server";

// Limite de débit, côté serveur seulement : au plus `max` passages en `seconds` pour une clé (IP, e-mail, compte).
// La clé est gardée chiffrée, un jour au plus (fonction public.hit). En cas de panne, on refuse : null au lieu de false.
export async function allow(key: string, max: number, seconds: number): Promise<boolean | null> {
  const k = createHash("sha256").update(key).digest("hex").slice(0, 32);
  const { data, error } = await admin().rpc("hit", { k, lim: max, win: seconds });
  return error ? null : data === true;
}

// L'adresse IP de la personne (Vercel la pose en tête de x-forwarded-for).
export async function ip() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "local";
}
