"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sb } from "../../supabase";

// Les rubriques de l'admin. Chaque page vérifie elle-même le droit d'accès (is_admin côté base).
const TABS = [
  { href: "/admin", label: "Inscrits" },
  { href: "/admin/waitlist", label: "Waitlist" },
  { href: "/admin/lettres", label: "Lettres" },
  { href: "/admin/feedback", label: "Feedback" },
];

export default function Tabs() {
  const path = usePathname();
  const [ok, setOk] = useState(false);
  useEffect(() => { sb().rpc("is_admin").then(({ data }) => setOk(data === true)); }, []);
  if (!ok) return null;
  return (
    <div className="page wide ad-bar">
      <nav className="seg ad-tabs" aria-label="Admin">
        {TABS.map((t) => <Link key={t.href} href={t.href} className={(t.href === "/admin" ? path === t.href : path.startsWith(t.href)) ? "on" : ""}>{t.label}</Link>)}
      </nav>
    </div>
  );
}
