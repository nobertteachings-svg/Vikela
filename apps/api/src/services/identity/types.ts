export interface IdentityCredentials {
  accessToken: string;
  refreshToken?: string;
  /** Okta org domain, e.g. dev-123456.okta.com */
  domain?: string;
  /** Azure AD tenant ID */
  tenantId?: string;
  /** Google Workspace customer ID (optional) */
  customerId?: string;
  /** Auth0 tenant domain */
  auth0Domain?: string;
  /** JumpCloud API key (stored encrypted in accessToken) */
  apiKey?: string;
}

export function isDemoIdentityToken(token: string): boolean {
  return token === "demo" || token === "demo-token" || token.startsWith("pending");
}
