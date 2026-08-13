import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { ApiAuthProvider } from "@/components/comply/api-auth-provider";
import { LogoPill } from "@/components/comply/logo-pill";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ApiAuthProvider>
      <div className="marketing-bg relative flex min-h-screen flex-col text-comply-text-primary antialiased">
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <div className="mb-8 flex items-center justify-between gap-3 sm:mb-10">
            <Link href="/" className="min-w-0">
              <LogoPill />
            </Link>
            <Link
              href="/"
              className="inline-flex shrink-0 items-center gap-1.5 text-xs text-comply-muted transition-colors hover:text-comply-text-secondary"
            >
              <IconArrowLeft size={14} />
              <span className="hidden sm:inline">Back to home</span>
              <span className="sm:hidden">Home</span>
            </Link>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center pb-10 sm:pb-12">
            {children}
          </div>
        </div>
      </div>
    </ApiAuthProvider>
  );
}
