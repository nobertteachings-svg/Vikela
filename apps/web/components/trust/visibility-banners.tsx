/** Confidentiality callout for private audit trail (not the visitor trust page). */

export function ConfidentialAuditBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`mb-4 rounded-lg border border-comply-green/30 bg-comply-green/10 px-4 py-3 text-sm text-comply-text-secondary ${className}`}
      role="status"
    >
      <p className="font-medium text-comply-green">Confidential · organization only</p>
      <p className="mt-1">
        This audit trail is visible only to signed-in members of your workspace. It is not part of
        the customer trust center.
      </p>
    </div>
  );
}
