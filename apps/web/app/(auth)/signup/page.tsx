import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/marketing/auth-screen";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

/** Legacy marketing path, redirect to Clerk sign-up when auth is enabled. */
export default function SignupPage() {
  if (hasClerk) redirect("/sign-up");
  return <AuthScreen mode="signup" />;
}
