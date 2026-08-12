import { redirect } from "next/navigation";
import { SignUp } from "@clerk/nextjs";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function SignUpPage() {
  if (!hasClerk) {
    redirect("/signup");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignUp
        forceRedirectUrl="/onboarding/connect-repos"
        fallbackRedirectUrl="/onboarding/connect-repos"
        signInForceRedirectUrl="/dashboard"
      />
    </div>
  );
}
