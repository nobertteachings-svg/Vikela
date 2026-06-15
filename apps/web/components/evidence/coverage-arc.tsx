"use client";

type CoverageArcProps = {
  covered: number;
  total: number;
  label?: string;
  size?: "default" | "compact";
};

export function CoverageArc({
  covered,
  total,
  label = "Evidence coverage",
  size = "default",
}: CoverageArcProps) {
  const percent = total > 0 ? Math.round((covered / total) * 100) : 0;
  const pct = percent / 100;
  const r = 56;
  const circumference = Math.PI * r * 1.5;
  const offset = circumference * (1 - pct * 0.75);
  const compact = size === "compact";

  return (
    <div className="flex flex-col items-center py-2">
      <div className="relative flex flex-col items-center">
        <svg
          width={compact ? 140 : 180}
          height={compact ? 100 : 130}
          viewBox="0 0 180 130"
          className="overflow-visible"
          role="img"
          aria-label={`${covered} of ${total} controls have evidence, ${percent} percent`}
        >
          <defs>
            <linearGradient id="coverageArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2d6a4f" />
              <stop offset="100%" stopColor="#52b788" />
            </linearGradient>
          </defs>
          <path
            d="M 28 105 A 62 62 0 1 1 152 105"
            fill="none"
            stroke="var(--bg-primary)"
            strokeWidth="14"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path
            d="M 28 105 A 62 62 0 1 1 152 105"
            fill="none"
            stroke="url(#coverageArcGrad)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className={compact ? "absolute top-[2.5rem] text-center" : "absolute top-[3.25rem] text-center"}>
          <p className={compact ? "font-mono text-2xl font-semibold text-comply-text-primary" : "font-mono text-4xl font-semibold text-comply-text-primary"}>
            {percent}%
          </p>
        </div>
      </div>
      <p className={compact ? "mt-1 text-xs font-medium text-comply-text-secondary" : "mt-1 text-sm font-medium text-comply-text-secondary"}>
        {label}
      </p>
      <p className={compact ? "mt-1 max-w-[200px] text-center text-xs text-comply-text-secondary" : "mt-2 max-w-xs text-center text-sm text-comply-text-secondary"}>
        <span className="font-mono font-medium text-comply-text-primary">{covered}</span>
        {" of "}
        <span className="font-mono font-medium text-comply-text-primary">{total}</span>
        {" controls have evidence"}
      </p>
    </div>
  );
}
