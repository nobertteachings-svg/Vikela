export function ReadOnlyBadge() {
  return (
    <div
      className="mb-4 flex items-center gap-2 rounded-md border border-comply-green/30 bg-comply-green/10 px-4 py-2 text-sm text-comply-green"
      role="status"
    >
      <span className="font-medium">Auditor access</span>
      <span className="text-comply-text-secondary">· view only</span>
    </div>
  );
}
