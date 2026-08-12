"use client";

import Link from "next/link";
import { useOrgRole } from "@/hooks/use-org-role";

export function IntegrationConnectLink({
  href,
  children,
  className,
  adminOnly = false,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  /** When true, only org admins can navigate (members see Admin required). */
  adminOnly?: boolean;
}) {
  const { appRole, isAuditor: auditor, isLoaded } = useOrgRole();

  if (isLoaded && auditor) {
    return <span className="text-xs text-comply-text-tertiary">View only</span>;
  }

  if (isLoaded && adminOnly && appRole !== "admin") {
    return <span className="text-xs text-comply-text-tertiary">Admin required</span>;
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
