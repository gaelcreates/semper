import type { Metadata } from "next";
import Login from "../Login";

export const metadata: Metadata = { title: "Connexion · Semper", robots: { index: false, follow: false } };

export default function Page() {
  return <Login />;
}
