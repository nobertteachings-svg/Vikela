"use client";

import { Sidebar } from "./sidebar";
import { ReadOnlyBadge } from "./read-only-badge";
import { WorkspaceIdentityBar } from "./workspace-identity-bar";
import { useOrgRole } from "@/hooks/use-org-role";

export function AppShellFrame({ children }: { children: React.ReactNode }) {
  const { isAuditor: auditor, isLoaded } = useOrgRole();

  return (
    <div className="app-bg relative min-h-screen overflow-x-hidden">
      <Sidebar />
      <main className="relative z-10 min-h-screen pl-[4.5rem] lg:pl-56">
        <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <WorkspaceIdentityBar />
          {isLoaded && auditor && <ReadOnlyBadge />}
          {children}
        </div>
      </main>
    </div>
  );
}
