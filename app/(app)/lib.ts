// Dates en heure locale, écrites « AAAA-MM-JJTHH:MM ». Pas de fuseau : un créateur planifie chez lui.

const p = (n: number) => String(n).padStart(2, "0");

export function parse(s: string) {
  const [d, t = "00:00"] = s.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  return new Date(y, m - 1, day, h, mi);
}
export function fmt(d: Date) {
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export const dayKey = (d: Date) => fmt(d).slice(0, 10);
export const addMinutes = (s: string, n: number) => fmt(new Date(parse(s).getTime() + n * 60000));
export const diffMinutes = (a: string, b: string) => Math.round((parse(a).getTime() - parse(b).getTime()) / 60000);
export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function startOfWeek(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
export function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
}
export const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes();

export const DAYS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
export const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const MONTHS_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export const hhmm = (d: Date) => `${p(d.getHours())}:${p(d.getMinutes())}`;
export function short(s: string | null) {
  if (!s) return "Sans date";
  const d = parse(s);
  return `${DAYS[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} · ${hhmm(d)}`;
}
export function duration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${p(m)}` : `${h} h`;
}

// « @pseudo », « pseudo » ou le lien du profil : on garde le pseudo, seulement les caractères permis par Instagram, 30 au plus.
export const cleanHandle = (s: string) => s.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?].*$/, "").replace(/[^A-Za-z0-9._]/g, "").slice(0, 30);
