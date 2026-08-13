"use client";

import { Sidebar } from "./sidebar";
import { ReadOnlyBadge } from "./read-only-badge";
import { WorkspaceIdentityBar } from "./workspace-identity-bar";
import { useOrgRole } from "@/hooks/use-org-role";

export function AppShellFrame({ children }: { children: React.ReactNode }) {
  const { isAuditor: auditor, isLoaded } = useOrgRole();

  return (
    <div className="app-bg relative min-h-screen overflow-x-hidden">
      <div
        className="app-ambient-orb absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-comply-purple/20"
        aria-hidden
      />
      <div
        className="app-ambient-orb absolute -right-32 top-1/3 h-[300px] w-[300px] rounded-full bg-comply-green/10"
        aria-hidden
      />
      <div className="app-grid-overlay pointer-events-none absolute inset-0 opacity-50" aria-hidden />

      <Sidebar />
      <main className="relative z-10 min-h-screen pl-[4.5rem] lg:pl-52">
        <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <WorkspaceIdentityBar />
          {isLoaded && auditor && <ReadOnlyBadge />}
          {children}
        </div>
      </main>
    </div>
  );
}
