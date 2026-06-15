export function GapSampleBadge({ className }: { className?: string }) {
  return (
    <span
      className={
        className ??
        "ml-2 rounded border border-amber-500/40 px-1 py-0.5 text-[9px] font-normal uppercase text-amber-300/90"
      }
    >
      Sample
    </span>
  );
}
