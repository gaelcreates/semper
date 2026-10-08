"use client";

import { useData } from "./store";

// La photo de profil, ou l'initiale du prénom sur fond d'encre quand il n'y en a pas.
export default function Avatar({ size = 32 }: { size?: number }) {
  const p = useData()?.profile;
  if (!p) return null;
  const letter = (p.firstName || p.email || "?").trim().charAt(0).toUpperCase();
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {p.avatar ? <img src={p.avatar} alt="" width={size} height={size} /> : letter}
    </span>
  );
}
