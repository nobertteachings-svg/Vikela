"use client";

export function PostureArc({ score, max = 100 }: { score: number; max?: number }) {
  const pct = score / max;
  const r = 56;
  const circumference = Math.PI * r * 1.5;
  const offset = circumference * (1 - pct * 0.75);

  return (
    <div className="relative flex flex-col items-center py-2">
      <svg width="180" height="130" viewBox="0 0 180 130" className="overflow-visible">
        <defs>
          <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#16a34a" />
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
          stroke="url(#arcGrad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute top-[3.25rem] text-center">
        <p className="font-mono text-4xl font-semibold tracking-tight text-comply-text-primary">
          {score}
        </p>
        <p className="text-sm text-comply-text-tertiary">/ {max}</p>
      </div>
      <p className="mt-1 text-sm font-medium text-comply-text-secondary">Posture score</p>
    </div>
  );
}
