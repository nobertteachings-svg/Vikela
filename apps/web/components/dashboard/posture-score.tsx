"use client";

import { cn, scoreColor, scoreBg } from "@/lib/utils";

export function PostureScore({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#27272a" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(scoreColor(score), "transition-all duration-700")}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-4xl font-bold", scoreColor(score))}>{score}</span>
          <span className="text-xs text-muted">Posture Score</span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <div className={cn("h-2 w-2 rounded-full", scoreBg(score))} />
        <span className="text-sm text-zinc-400">
          {score >= 80 ? "Audit ready" : score >= 60 ? "Needs work" : "At risk"}
        </span>
      </div>
    </div>
  );
}
