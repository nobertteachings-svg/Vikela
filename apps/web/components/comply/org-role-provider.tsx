"use client";

import { createContext, useContext } from "react";
import { useAuth } from "@clerk/nextjs";
import { isAuditor, parseOrgRole, type AppRole } from "@/lib/clerk-roles";

export type OrgRoleContextValue = {
  orgRole: string | null | undefined;
  appRole: AppRole;
  isAuditor: boolean;
  isLoaded: boolean;
  orgId: string | null | undefined;
};

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

/** Local dev without Clerk, treat as loaded admin so mutation UI is testable. */
const NO_CLERK_VALUE: OrgRoleContextValue = {
  orgRole: undefined,
  appRole: "admin",
  isAuditor: false,
  isLoaded: true,
  orgId: undefined,
};

const OrgRoleContext = createContext<OrgRoleContextValue>(NO_CLERK_VALUE);

function ClerkOrgRoleProvider({ children }: { children: React.ReactNode }) {
  const { orgRole, isLoaded, orgId } = useAuth();
  const value: OrgRoleContextValue = {
    orgRole,
    appRole: parseOrgRole(orgRole),
    isAuditor: isAuditor(orgRole),
    isLoaded,
    orgId,
  };
  return <OrgRoleContext.Provider value={value}>{children}</OrgRoleContext.Provider>;
}

export function OrgRoleProvider({ children }: { children: React.ReactNode }) {
  if (!hasClerk) {
    return <OrgRoleContext.Provider value={NO_CLERK_VALUE}>{children}</OrgRoleContext.Provider>;
  }
  return <ClerkOrgRoleProvider>{children}</ClerkOrgRoleProvider>;
}

export function useOrgRole(): OrgRoleContextValue {
  return useContext(OrgRoleContext);
}
