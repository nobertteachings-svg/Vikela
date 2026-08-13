"use client";

import { OrganizationSwitcher, UserButton, useAuth, useOrganization, useUser } from "@clerk/nextjs";

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const clerkDark = {
  variables: {
    colorPrimary: "#16a34a",
    colorText: "#f5f5f4",
    colorTextSecondary: "#a8a29e",
    colorBackground: "#1c1c1a",
    colorInputBackground: "#141413",
    colorInputText: "#f5f5f4",
    colorNeutral: "#78716c",
    borderRadius: "0.5rem",
  },
  elements: {
    organizationSwitcherTrigger:
      "gap-2 rounded-md border border-transparent !bg-transparent px-1 py-1 text-sm text-comply-text-primary hover:!bg-white/[0.04]",
    organizationSwitcherTriggerIcon: "text-comply-text-tertiary",
    organizationPreviewMainIdentifier: "hidden",
    organizationPreviewSecondaryIdentifier: "hidden",
    organizationPreviewAvatarBox: "h-7 w-7",
    userButtonBox: "gap-0",
    userButtonOuterIdentifier: "hidden",
    userButtonTrigger: "rounded-md border border-transparent !bg-transparent p-0.5 hover:!bg-white/[0.04]",
    avatarBox: "h-7 w-7",
  },
} as const;

/**
 * GitHub-style workspace identity: org logo + name (switcher) and member avatar + display name.
 */
export function WorkspaceIdentityBar() {
  const { isLoaded, isSignedIn } = useAuth();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { user, isLoaded: userLoaded } = useUser();

  if (!hasClerk) {
    return (
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-comply-text-secondary">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-comply-green/20 text-xs font-semibold text-comply-green">
            V
          </span>
          Local workspace
        </div>
        <div className="text-sm text-comply-text-tertiary">Dev user</div>
      </div>
    );
  }

  if (!isLoaded || !orgLoaded || !userLoaded) {
    return (
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div className="h-9 w-44 animate-pulse rounded-md bg-white/[0.06]" />
        <div className="h-9 w-36 animate-pulse rounded-md bg-white/[0.06]" />
      </div>
    );
  }

  if (!isSignedIn) return null;

  const orgName = organization?.name ?? "Select organization";
  const displayName =
    user?.fullName ||
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "Account";

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
      <div className="flex min-w-0 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1.5">
        <OrganizationSwitcher
          hidePersonal
          afterCreateOrganizationUrl="/onboarding/connect-repos"
          afterSelectOrganizationUrl="/dashboard"
          appearance={clerkDark}
        />
        <div className="min-w-0 pr-1">
          <p className="truncate text-sm font-medium text-comply-text-primary">{orgName}</p>
          <p className="truncate text-[10px] uppercase tracking-wider text-comply-text-tertiary">
            Organization
          </p>
        </div>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1.5">
        <div className="hidden min-w-0 text-right sm:block">
          <p className="truncate text-sm font-medium text-comply-text-primary">{displayName}</p>
          <p className="truncate text-[10px] uppercase tracking-wider text-comply-text-tertiary">
            Signed in
          </p>
        </div>
        <UserButton
          appearance={clerkDark}
          userProfileMode="navigation"
          userProfileUrl="/settings"
        />
      </div>
    </div>
  );
}
