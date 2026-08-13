"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconLayoutDashboard,
  IconShield,
  IconListCheck,
  IconAlertTriangle,
  IconHistory,
  IconFolder,
  IconFileText,
  IconRobot,
  IconChartDots,
  IconBuildingStore,
  IconUsers,
  IconSchool,
  IconPlug,
  IconSettings,
  IconCreditCard,
  IconTool,
  IconForms,
  IconWorld,
  IconClipboardList,
  IconHelpCircle,
  IconHome,
  IconMenu2,
  IconX,
} from "@tabler/icons-react";
import { LogoPill } from "./logo-pill";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/product-config";
import { navItemsForAuditor } from "@/lib/clerk-roles";
import { useOrgRole } from "@/hooks/use-org-role";

const icons: Record<string, typeof IconLayoutDashboard> = {
  dashboard: IconLayoutDashboard,
  frameworks: IconShield,
  controls: IconListCheck,
  gaps: IconAlertTriangle,
  remediation: IconTool,
  scans: IconHistory,
  evidence: IconFolder,
  policies: IconFileText,
  copilot: IconRobot,
  risks: IconChartDots,
  vendors: IconBuildingStore,
  questionnaire: IconForms,
  team: IconUsers,
  training: IconSchool,
  trust: IconWorld,
  audit: IconClipboardList,
  integrations: IconPlug,
  help: IconHelpCircle,
  settings: IconSettings,
  billing: IconCreditCard,
};

const dividerLabels = ["Program", "Ops", "Admin"];

function NavBody({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const { isAuditor: auditor } = useOrgRole();
  const items = navItemsForAuditor(navItems, auditor);
  let dividerIdx = 0;

  return (
    <div className={cn("flex h-full flex-col p-3 sm:p-4", className)}>
      <Link
        href="/dashboard"
        className="mb-5 px-1 sm:px-2"
        title="Dashboard"
        onClick={onNavigate}
      >
        <LogoPill size="sm" />
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
        {items.map((item, i) => {
          if ("divider" in item && item.divider) {
            const label = dividerLabels[dividerIdx++];
            return (
              <div key={`d-${i}`} className="my-2.5">
                {label ? (
                  <p className="mb-1.5 px-2 text-[10px] font-medium uppercase tracking-wider text-comply-text-tertiary">
                    {label}
                  </p>
                ) : null}
                <hr className="border-[var(--border)]" />
              </div>
            );
          }

          const href = item.href!;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = icons[item.icon!] ?? IconLayoutDashboard;

          return (
            <Link
              key={href}
              href={href}
              title={item.label}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150",
                active
                  ? "bg-comply-green/15 font-medium text-comply-green-light"
                  : "text-comply-text-secondary hover:bg-white/[0.04] hover:text-comply-text-primary"
              )}
            >
              <Icon
                size={18}
                stroke={1.75}
                className={cn(
                  "shrink-0",
                  active
                    ? "text-comply-green"
                    : "text-comply-text-tertiary group-hover:text-comply-text-secondary"
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[var(--border)] pt-3">
        <Link
          href="/"
          title="Vikela website"
          onClick={onNavigate}
          className="group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-comply-text-secondary transition-colors hover:bg-white/[0.04] hover:text-comply-text-primary"
        >
          <IconHome
            size={18}
            stroke={1.75}
            className="shrink-0 text-comply-text-tertiary group-hover:text-comply-text-secondary"
          />
          <span className="truncate">Website</span>
        </Link>
      </div>
    </div>
  );
}

/** Compact icon rail for md+ when drawer is closed on desktop. */
function DesktopRail() {
  const pathname = usePathname();
  const { isAuditor: auditor } = useOrgRole();
  const items = navItemsForAuditor(navItems, auditor);

  return (
    <div className="flex h-full flex-col p-3">
      <Link href="/dashboard" className="mb-5 flex justify-center" title="Dashboard">
        <LogoPill size="sm" showLabel={false} />
      </Link>
      <nav className="flex flex-1 flex-col items-center gap-0.5 overflow-y-auto">
        {items.map((item, i) => {
          if ("divider" in item && item.divider) {
            return <hr key={`d-${i}`} className="my-2 w-8 border-[var(--border)]" />;
          }
          const href = item.href!;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = icons[item.icon!] ?? IconLayoutDashboard;
          return (
            <Link
              key={href}
              href={href}
              title={item.label}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                active
                  ? "bg-comply-green/15 text-comply-green"
                  : "text-comply-text-tertiary hover:bg-white/[0.04] hover:text-comply-text-primary"
              )}
            >
              <Icon size={18} stroke={1.75} />
            </Link>
          );
        })}
      </nav>
      <Link
        href="/"
        title="Website"
        className="mt-auto flex h-10 w-10 items-center justify-center rounded-md text-comply-text-tertiary hover:bg-white/[0.04] hover:text-comply-text-primary"
      >
        <IconHome size={18} stroke={1.75} />
      </Link>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-12 items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-sidebar)] px-3 md:hidden">
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-comply-text-primary"
        >
          {open ? <IconX size={18} /> : <IconMenu2 size={18} />}
        </button>
        <Link href="/dashboard" className="min-w-0">
          <LogoPill size="sm" />
        </Link>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      />
      <aside
        className={cn(
          "sidebar-panel fixed bottom-0 left-0 top-12 z-50 w-[min(18rem,86vw)] transform transition-transform duration-200 md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavBody onNavigate={() => setOpen(false)} />
      </aside>

      {/* Tablet icon rail */}
      <aside className="sidebar-panel fixed bottom-0 left-0 top-0 z-40 hidden w-14 flex-col md:flex lg:hidden">
        <DesktopRail />
      </aside>

      {/* Desktop full sidebar */}
      <aside className="sidebar-panel fixed bottom-0 left-0 top-0 z-40 hidden w-56 flex-col lg:flex">
        <NavBody />
      </aside>
    </>
  );
}
