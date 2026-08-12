"use client";

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

export function Sidebar() {
  const pathname = usePathname();
  const { isAuditor: auditor } = useOrgRole();
  const items = navItemsForAuditor(navItems, auditor);
  let dividerIdx = 0;

  return (
    <aside className="sidebar-panel fixed left-0 top-0 z-40 flex h-screen w-[4.5rem] flex-col lg:w-52">
      <div className="flex h-full flex-col p-3 lg:p-4">
        <Link
          href="/dashboard"
          className="mb-6 px-1 lg:px-2"
          title="Dashboard"
        >
          <LogoPill
            size="sm"
            className="[&>span:last-child]:hidden [&>span:last-child]:lg:inline"
          />
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
          {items.map((item, i) => {
            if ("divider" in item && item.divider) {
              const label = dividerLabels[dividerIdx++];
              return (
                <div key={`d-${i}`} className="my-3">
                  {label && (
                    <p className="mb-2 hidden px-2 text-[10px] font-semibold uppercase tracking-widest text-comply-text-tertiary lg:block">
                      {label}
                    </p>
                  )}
                  <hr className="border-white/[0.06]" />
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
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-all duration-150 lg:px-3",
                  active
                    ? "bg-comply-purple font-medium text-white nav-active-glow"
                    : "text-comply-text-secondary hover:bg-white/[0.04] hover:text-comply-text-primary"
                )}
              >
                <Icon
                  size={18}
                  stroke={1.75}
                  className={cn(
                    "shrink-0",
                    active
                      ? "text-white"
                      : "text-comply-text-tertiary group-hover:text-comply-purple-border"
                  )}
                />
                <span className="hidden truncate lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/[0.06] pt-3">
          <Link
            href="/"
            title="Vikela website"
            className="group flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-comply-text-secondary transition-all hover:bg-white/[0.04] hover:text-comply-text-primary lg:px-3"
          >
            <IconHome
              size={18}
              stroke={1.75}
              className="shrink-0 text-comply-text-tertiary group-hover:text-comply-purple-border"
            />
            <span className="hidden truncate lg:inline">Website</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
