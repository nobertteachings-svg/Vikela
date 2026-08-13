"use client";

import { cn } from "@/lib/utils";

export type FrameworkCardVariant = "default" | "selected" | "new";

export function FrameworkCard({
  id,
  name,
  description,
  variant,
  selected,
  onToggle,
}: {
  id: string;
  name: string;
  description: string;
  variant: FrameworkCardVariant;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const isNew = variant === "new";
  const isSelected = selected && !isNew;
  const isNewSelected = selected && isNew;

  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      className={cn(
        "relative flex h-[70px] w-[136px] flex-col items-center justify-center rounded-md border px-2 transition-all",
        isNew &&
          !isNewSelected &&
          "border-[0.5px] bg-comply-amber-light",
        isNew && isNewSelected && "border-[1.5px] border-comply-green bg-comply-amber-light",
        !isNew && isSelected && "border-[1.5px] border-comply-green bg-comply-green-light",
        !isNew && !isSelected && "border-[0.5px] border-[var(--border)] bg-comply-card"
      )}
      style={
        isNew
          ? { borderColor: isNewSelected ? "var(--purple)" : "var(--amber-dark)" }
          : undefined
      }
    >
      <span
        className={cn(
          "text-sm font-medium",
          isNew && "text-comply-amber-text",
          isSelected && !isNew && "text-comply-green-text",
          !isNew && !isSelected && "text-comply-text-primary"
        )}
      >
        {name}
      </span>
      <span
        className={cn(
          "mt-0.5 text-xs",
          isNew && "text-comply-amber-dark",
          isSelected && !isNew && "text-comply-green",
          !isNew && !isSelected && "text-comply-text-secondary"
        )}
      >
        {description}
      </span>
      <span
        className={cn(
          "absolute bottom-2 inline-flex h-[14px] items-center justify-center rounded-sm border text-[10px] font-medium",
          isSelected || isNewSelected
            ? "w-12 border-transparent bg-comply-green text-comply-green-light"
            : "w-14 border-[var(--border-light)] bg-comply-cream text-comply-text-secondary"
        )}
      >
        {isSelected || isNewSelected ? "Selected" : "Add"}
      </span>
    </button>
  );
}
