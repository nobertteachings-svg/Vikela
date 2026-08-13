import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/marketing/auth-screen";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

/** Legacy marketing path, redirect to Clerk sign-in when auth is enabled. */
export default function LoginPage() {
  if (hasClerk) redirect("/sign-in");
  return <AuthScreen mode="login" />;
}
