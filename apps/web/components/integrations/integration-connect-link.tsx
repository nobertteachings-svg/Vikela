"use client";

import Link from "next/link";
import { useOrgRole } from "@/hooks/use-org-role";

export function IntegrationConnectLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { isAuditor: auditor, isLoaded } = useOrgRole();

  if (isLoaded && auditor) {
    return <span className="text-xs text-comply-text-tertiary">View only</span>;
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
