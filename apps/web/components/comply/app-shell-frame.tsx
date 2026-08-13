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
      <main className="relative z-10 min-h-screen pt-12 md:pl-14 md:pt-0 lg:pl-56">
        <div className="mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-7">
          <WorkspaceIdentityBar />
          {isLoaded && auditor ? <ReadOnlyBadge /> : null}
          {children}
        </div>
      </main>
    </div>
  );
}
