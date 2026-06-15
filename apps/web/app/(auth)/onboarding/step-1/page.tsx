import { redirect } from "next/navigation";

export default function OnboardingStep1Redirect() {
  redirect("/onboarding/connect-repos");
}
