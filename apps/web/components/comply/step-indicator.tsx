import { cn } from "@/lib/utils";

const STEPS = [
  { num: 1, label: "Connect" },
  { num: 2, label: "Frameworks" },
  { num: 3, label: "Team" },
] as const;

function StepCircle({ state, num }: { state: "completed" | "active" | "upcoming"; num: number }) {
  if (state === "completed") {
    return (
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-medium"
        style={{
          background: "var(--green)",
          borderColor: "var(--green-dark)",
          color: "var(--green-light)",
        }}
      >
        ✓
      </span>
    );
  }
  if (state === "active") {
    return (
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-medium"
        style={{
          background: "var(--purple)",
          borderColor: "var(--purple-dark)",
          color: "var(--purple-light)",
        }}
      >
        {num}
      </span>
    );
  }
  return (
    <span
      className="flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-medium text-comply-text-secondary"
      style={{
        background: "var(--bg-cream)",
        borderColor: "var(--border-light)",
      }}
    >
      {num}
    </span>
  );
}

function Connector({ completed }: { completed: boolean }) {
  return (
    <div
      className="h-px w-[68px] shrink-0"
      style={{
        background: completed ? "var(--purple)" : "var(--border-light)",
      }}
    />
  );
}

export function StepIndicator({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <div className="mb-8 flex flex-col items-center">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const state =
            step.num < currentStep
              ? "completed"
              : step.num === currentStep
                ? "active"
                : "upcoming";
          return (
            <div key={step.num} className="flex items-center">
              <StepCircle state={state} num={step.num} />
              {i < STEPS.length - 1 && <Connector completed={step.num < currentStep} />}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex w-full max-w-[340px] justify-between px-1">
        {STEPS.map((step) => (
          <span
            key={step.label}
            className={cn(
              "text-xs",
              step.num === currentStep
                ? "font-medium text-comply-green"
                : "text-comply-text-secondary"
            )}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}
