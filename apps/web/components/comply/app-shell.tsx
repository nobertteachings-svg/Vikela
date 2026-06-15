import { Sidebar } from "./sidebar";
import { ApiAuthProvider } from "./api-auth-provider";
import { AppShellFrame } from "./app-shell-frame";
import { OrgRoleProvider } from "./org-role-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ApiAuthProvider>
      <OrgRoleProvider>
        <AppShellFrame>{children}</AppShellFrame>
      </OrgRoleProvider>
    </ApiAuthProvider>
  );
}
