export function ScanLiteBadge({ className }: { className?: string }) {
  return (
    <span
      className={
        className ??
        "ml-2 rounded border border-sky-500/40 px-1 py-0.5 text-[9px] font-normal uppercase text-sky-300/90"
      }
    >
      Lite
    </span>
  );
}
