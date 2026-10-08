import type { Metadata } from "next";

export const metadata: Metadata = { title: "Calendrier · Semper" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
