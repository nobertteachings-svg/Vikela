"use client";

import { useEffect, useId, useRef, useState } from "react";
import { IconCopy, IconMail, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const SALES_EMAIL = "hello@vikela.com";
const SALES_SUBJECT = "Vikela Enterprise inquiry";

type Variant = "card" | "cta" | "link";

export function ContactSalesButton({
  variant = "card",
  className,
  label = "Contact sales",
}: {
  variant?: Variant;
  className?: string;
  label?: string;
}) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(SALES_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      window.prompt("Copy this email address:", SALES_EMAIL);
    }
  }

  function openMailClient() {
    const href = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(SALES_SUBJECT)}`;
    window.location.href = href;
  }

  const triggerClass =
    variant === "cta"
      ? "btn-purple-cta inline-flex h-9 items-center px-4 text-sm"
      : variant === "link"
        ? "flex items-center gap-1 text-xs font-medium text-comply-green-border hover:underline"
        : "mt-5 inline-flex h-9 w-full items-center justify-center rounded-md border border-[var(--border)] text-xs font-medium text-comply-text-primary transition-colors hover:border-comply-green-border";

  return (
    <div ref={rootRef} className={cn("relative", variant === "card" && "w-full", className)}>
      <button
        type="button"
        className={triggerClass}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Contact sales"
          className={cn(
            "z-20 w-[min(100%,18rem)] rounded-md border border-white/[0.12] bg-comply-elevated p-3 shadow-xl",
            variant === "card"
              ? "absolute bottom-full left-0 mb-2"
              : "absolute right-0 top-full mt-2"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-comply-text-primary">Talk to sales</p>
              <p className="mt-1 text-[11px] leading-relaxed text-comply-text-secondary">
                Email us about Enterprise pricing, FedRAMP, or procurement.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-0.5 text-comply-text-tertiary hover:text-comply-text-primary"
              aria-label="Close"
            >
              <IconX size={14} />
            </button>
          </div>

          <p className="mt-3 break-all font-mono text-xs text-comply-green-border">{SALES_EMAIL}</p>

          <div className="mt-3 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => void copyEmail()}
              className="comply-btn-primary inline-flex h-8 items-center justify-center gap-1.5 text-xs"
            >
              <IconCopy size={14} />
              {copied ? "Copied" : "Copy email"}
            </button>
            <button
              type="button"
              onClick={openMailClient}
              className="comply-btn-secondary inline-flex h-8 items-center justify-center gap-1.5 text-xs"
            >
              <IconMail size={14} />
              Open email app
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
