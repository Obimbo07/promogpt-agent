import type { SocialConnector } from "@/lib/connectors/types";

import type { SocialIntegrationAdapter } from "@/lib/integrations/social/types";
import { listCoreSocialAdapters } from "@/lib/integrations/social/registry";

class StubConnector implements SocialConnector {
  constructor(
    public readonly id: SocialConnector["id"],
    public readonly displayName: string,
    public readonly capabilities: SocialConnector["capabilities"]
  ) {}

  async getAuthorizationUrl(input: {
    workspaceId: string;
    redirectUri: string;
    appOrigin?: string;
  }) {
    const origin =
      input.appOrigin ??
      (() => {
        try {
          return new URL(input.redirectUri).origin;
        } catch {
          return "http://localhost:3000";
        }
      })();
    return `${origin}/onboarding?oauth_stub=${encodeURIComponent(this.id)}&workspace=${encodeURIComponent(input.workspaceId)}`;
  }
}

class AdapterBackedConnector implements SocialConnector {
  readonly id: SocialConnector["id"];
  readonly displayName: string;
  capabilities: SocialConnector["capabilities"];

  constructor(private readonly adapter: SocialIntegrationAdapter) {
    this.id = adapter.id;
    this.displayName = adapter.displayName;
    this.capabilities = adapter.capabilities;
  }

  async getAuthorizationUrl(input: {
    workspaceId: string;
    redirectUri: string;
    appOrigin?: string;
  }) {
    const origin =
      input.appOrigin ??
      (() => {
        try {
          return new URL(input.redirectUri).origin;
        } catch {
          return "http://localhost:3000";
        }
      })();

    const started = await this.adapter.initiateConnection({
      workspaceId: input.workspaceId,
      redirectUri: input.redirectUri,
      appOrigin: origin.replace(/\/$/, ""),
      oauthStateNonce: crypto.randomUUID(),
    });

    if (started.kind === "oauth_redirect") {
      return started.authorizationUrl;
    }

    return `${origin}/onboarding?manual_provider=${encodeURIComponent(this.adapter.id)}&workspace=${encodeURIComponent(input.workspaceId)}`;
  }
}

/** Registry — core social adapters + placeholder stubs for extended networks. */
export const CONNECTOR_REGISTRY: SocialConnector[] = [
  ...listCoreSocialAdapters().map((a) => new AdapterBackedConnector(a)),
  new StubConnector("youtube", "YouTube", ["publish", "analytics"]),
];
