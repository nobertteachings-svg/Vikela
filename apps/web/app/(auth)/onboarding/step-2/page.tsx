import { redirect } from "next/navigation";

export default function OnboardingStep2Redirect() {
  redirect("/onboarding/connect-cloud");
}
