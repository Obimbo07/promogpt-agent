import type { ConnectorCapability } from "@/lib/connectors/types";

/** Core social surfaces wired first for onboarding + connector_accounts.provider values. */
export type SocialProviderId =
  | "x"
  | "telegram"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "linkedin";

export type ConnectionInitResult =
  | { kind: "oauth_redirect"; authorizationUrl: string }
  | { kind: "manual_setup"; instructions: string };

export interface SocialIntegrationAdapter {
  readonly id: SocialProviderId;
  readonly displayName: string;
  readonly capabilities: ConnectorCapability[];

  initiateConnection(input: {
    workspaceId: string;
    /** Legacy X OAuth URL construction (until X callback lands). */
    redirectUri: string;
    /** Public origin without trailing slash. */
    appOrigin: string;
    /** Validates OAuth redirects (persisted under pending row metadata.oauth_nonce). */
    oauthStateNonce: string;
    /**
     * RFC 7636 PKCE — TikTok requires `code_challenge` on authorize and `code_verifier` at token.
     * Persist server-side only (e.g. metadata.oauth_code_verifier), never return to clients.
     */
    pkceCodeVerifier?: string;
  }): Promise<ConnectionInitResult>;
}

export type ConnectorAccountStatus =
  | "disconnected"
  | "pending"
  | "connected"
  | "error";
