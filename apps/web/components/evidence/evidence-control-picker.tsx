"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";

export type OrgControlOption = {
  id: string;
  code: string;
  title: string;
};

type EvidenceControlPickerProps = {
  value: OrgControlOption | null;
  onChange: (value: OrgControlOption | null) => void;
  className?: string;
};

export function EvidenceControlPicker({ value, onChange, className }: EvidenceControlPickerProps) {
  const [options, setOptions] = useState<OrgControlOption[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<OrgControlOption[]>("/api/v1/evidence/org-controls")
      .then((rows) => {
        if (!cancelled) setOptions(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 50);
    return options
      .filter(
        (o) => o.code.toLowerCase().includes(q) || o.title.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [options, query]);

  const displayValue = value ? `${value.code}, ${value.title}` : "";

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-md text-left", className)}>
      <label className="flex flex-col gap-1.5 text-xs text-comply-text-tertiary">
        Link to control <span className="font-normal text-comply-muted">(optional)</span>
        <input
          type="text"
          role="combobox"
          aria-controls="control-picker-listbox"
          aria-expanded={open}
          aria-autocomplete="list"
          placeholder={loading ? "Loading controls…" : "Search by code or title"}
          value={open ? query : displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value) onChange(null);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-comply-text-primary placeholder:text-comply-muted focus:border-comply-green-border focus:outline-none focus:ring-1 focus:ring-comply-green-border/40"
        />
      </label>
      <p className="mt-1.5 text-[11px] text-comply-text-tertiary">
        Linking a control counts toward coverage.
      </p>

      {value && !open && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-2 text-xs text-comply-text-secondary underline-offset-2 hover:text-comply-green-border hover:underline"
        >
          Clear control
        </button>
      )}

      {open && !loading && (
        <ul
          id="control-picker-listbox"
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-white/10 bg-comply-elevated py-1 shadow-lg"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={value === null}
              className="w-full px-3 py-2 text-left text-sm text-comply-text-secondary hover:bg-white/[0.06]"
              onClick={() => {
                onChange(null);
                setQuery("");
                setOpen(false);
              }}
            >
              No control (unlinked)
            </button>
          </li>
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-comply-muted">No matching controls</li>
          ) : (
            filtered.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value?.id === o.id}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-white/[0.06]",
                    value?.id === o.id
                      ? "bg-comply-green/15 text-comply-green-border"
                      : "text-comply-text-primary"
                  )}
                  onClick={() => {
                    onChange(o);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <span className="font-mono text-xs text-comply-green-border">{o.code}</span>
                  <span className="mt-0.5 block truncate text-comply-text-secondary">{o.title}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}