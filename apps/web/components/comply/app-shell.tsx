import { ApiAuthProvider } from "./api-auth-provider";
import { AppShellFrame } from "./app-shell-frame";
import { MembershipBootstrap } from "./membership-bootstrap";
import { OrgRoleProvider } from "./org-role-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ApiAuthProvider>
      <MembershipBootstrap>
        <OrgRoleProvider>
          <AppShellFrame>{children}</AppShellFrame>
        </OrgRoleProvider>
      </MembershipBootstrap>
    </ApiAuthProvider>
  );
}
