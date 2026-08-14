"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Shield,
  ListChecks,
  AlertTriangle,
  FileCheck,
  FileText,
  MessageSquare,
  AlertCircle,
  Building2,
  Users,
  ClipboardList,
  Settings,
  Github,
  FolderGit,
  Cloud,
  Fingerprint,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/frameworks", label: "Frameworks", icon: Shield },
  { href: "/controls", label: "Controls", icon: ListChecks },
  { href: "/gaps", label: "Gaps", icon: AlertTriangle },
  { href: "/evidence", label: "Evidence", icon: FileCheck },
  { href: "/policies", label: "Policies", icon: FileText },
  { href: "/copilot", label: "AI Copilot", icon: MessageSquare },
  { href: "/risks", label: "Risks", icon: AlertCircle },
  { href: "/vendors", label: "Vendors", icon: Building2 },
  { href: "/team", label: "Team", icon: Users },
  { href: "/audit", label: "Audit", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/settings/repositories", label: "Repositories", icon: FolderGit },
  { href: "/settings/cloud-accounts", label: "Cloud Accounts", icon: Cloud },
  { href: "/settings/identity", label: "Identity", icon: Fingerprint },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight">Shieldoq</span>
          <p className="text-[10px] text-muted leading-none">Protect. Shield. Comply.</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-emerald-600/15 text-emerald-400"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800 p-4">
        <Link
          href="/settings/integrations"
          className="flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-xs text-zinc-400 hover:text-emerald-400"
        >
          <Github className="h-4 w-4" />
          Connect integrations
        </Link>
      </div>
    </aside>
  );
}
