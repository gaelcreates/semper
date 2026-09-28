import type { Metadata } from "next";
import "../(app)/app.css";

export const metadata: Metadata = { title: "Commencer · Semper", robots: { index: false, follow: false } };

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return <div className="ws solo">{children}</div>;
}
