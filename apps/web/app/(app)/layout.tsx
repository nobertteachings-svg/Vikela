import { AppShell } from "@/components/comply/app-shell";

/** Authenticated app routes always need request-time data (Clerk + API). */
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
