import Link from "next/link";

export function OnboardingShell({
  step,
  title,
  subtitle,
  children,
  continueHref,
  continueDisabled,
  skipHref,
}: {
  step: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  continueHref?: string;
  continueDisabled?: boolean;
  skipHref?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-comply-primary px-6 py-12">
      <div className="w-full max-w-lg">
        <p className="text-center text-xs text-comply-text-secondary">
          Step {step} of 3
        </p>
        <div className="mt-2 flex justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className={`h-2 w-2 rounded-full ${s <= step ? "bg-comply-purple" : "bg-comply-text-secondary/30"}`}
            />
          ))}
        </div>
        <h1 className="mt-8 text-center text-xl font-semibold text-comply-text-primary">{title}</h1>
        <p className="mt-2 text-center text-sm text-comply-text-secondary">{subtitle}</p>
        <div className="mt-8">{children}</div>
        <div className="mt-8 flex flex-col items-center gap-3">
          {continueHref && (
            <Link
              href={continueHref}
              className={`rounded-md bg-comply-purple px-6 py-2.5 text-sm font-medium text-white ${
                continueDisabled ? "pointer-events-none opacity-40" : "hover:bg-comply-purple-dark"
              }`}
            >
              Continue →
            </Link>
          )}
          {skipHref && (
            <Link href={skipHref} className="text-xs text-comply-text-secondary hover:underline">
              Skip for now
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
