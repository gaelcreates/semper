import type { Metadata } from "next";
import Shell from "./Shell";
import "./app.css";

export const metadata: Metadata = { title: "Semper", robots: { index: false, follow: false } };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
