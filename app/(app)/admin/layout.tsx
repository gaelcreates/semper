import type { Metadata } from "next";
import Tabs from "./Tabs";

export const metadata: Metadata = { title: "Admin · Semper" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <><Tabs />{children}</>;
}
