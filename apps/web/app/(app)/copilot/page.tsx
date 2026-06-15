import { Suspense } from "react";
import { CopilotWorkspace } from "@/components/copilot/CopilotWorkspace";

export default function CopilotPage() {
  return (
    <Suspense
      fallback={
        <div className="comply-page">
          <p className="text-sm text-comply-text-secondary">Loading copilot…</p>
        </div>
      }
    >
      <CopilotWorkspace />
    </Suspense>
  );
}
