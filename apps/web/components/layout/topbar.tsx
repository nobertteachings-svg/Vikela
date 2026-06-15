"use client";

import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Topbar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-800 bg-background/80 px-6 backdrop-blur">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            placeholder="Search controls, gaps..."
            className="h-9 w-64 rounded-md border border-zinc-800 bg-zinc-900 pl-9 pr-4 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none"
          />
        </div>
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-medium text-white">
          AS
        </div>
      </div>
    </header>
  );
}
