import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { ApiAuthProvider } from "@/components/comply/api-auth-provider";
import { LogoPill } from "@/components/comply/logo-pill";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ApiAuthProvider>
    <div className="marketing-bg relative flex min-h-screen flex-col overflow-hidden text-comply-text-primary antialiased">
      <div
        className="marketing-orb absolute -left-32 top-16 h-[380px] w-[380px] rounded-full bg-comply-purple/25"
        aria-hidden
      />
      <div
        className="marketing-orb absolute -right-20 bottom-24 h-[320px] w-[320px] rounded-full bg-comply-green/10"
        aria-hidden
      />
      <div className="marketing-shine pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="marketing-grid-overlay pointer-events-none absolute inset-0 opacity-30" aria-hidden />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8 lg:px-10">
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" className="group transition-transform group-hover:scale-[1.02]">
            <LogoPill />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-comply-muted transition-colors hover:text-comply-text-secondary"
          >
            <IconArrowLeft size={14} />
            Back to home
          </Link>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center pb-12">{children}</div>
      </div>
    </div>
    </ApiAuthProvider>
  );
}
