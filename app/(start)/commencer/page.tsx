import type { Metadata } from "next";
import Welcome from "../Welcome";

export const metadata: Metadata = { title: "Commencer · Semper" };

export default function Page() {
  return <Welcome />;
}
