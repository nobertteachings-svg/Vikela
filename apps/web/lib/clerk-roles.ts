export type AppRole = "admin" | "auditor" | "member";

/** Routes hidden from auditor nav and blocked via middleware direct access. */
export const AUDITOR_HIDDEN_NAV_HREFS = new Set([
  "/scans",
  "/integrations",
  "/settings",
  "/billing",
  "/team",
]);

export const AUDITOR_BLOCKED_ROUTE_PREFIXES = [
  "/onboarding",
  "/scans",
  "/integrations",
  "/settings",
  "/billing",
  "/team",
] as const;

export function parseOrgRole(orgRole: string | null | undefined): AppRole {
  if (!orgRole) return "member";
  const role = orgRole.toLowerCase();
  if (role.includes("admin")) return "admin";
  if (role.includes("auditor")) return "auditor";
  return "member";
}

export const isAuditor = (orgRole: string | null | undefined): boolean =>
  parseOrgRole(orgRole) === "auditor";

/** Auditor-only export UI; API also allows OWNER/ADMIN. */
export const canExportEvidence = isAuditor;

export function isAuditorBlockedPath(pathname: string): boolean {
  return AUDITOR_BLOCKED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

type NavItem = { href?: string; label?: string; icon?: string; divider?: boolean };

/** Filter static nav config for auditor read-only shell. */
export function navItemsForAuditor<T extends NavItem>(items: T[], auditor: boolean): T[] {
  if (!auditor) return items;

  const filtered = items.filter(
    (item) => item.divider || (item.href && !AUDITOR_HIDDEN_NAV_HREFS.has(item.href))
  );

  return filtered.filter((item, index, arr) => {
    if (!item.divider) return true;
    const hasLinkBefore = arr.slice(0, index).some((x) => !x.divider);
    const hasLinkAfter = arr.slice(index + 1).some((x) => !x.divider);
    return hasLinkBefore && hasLinkAfter;
  });
}
