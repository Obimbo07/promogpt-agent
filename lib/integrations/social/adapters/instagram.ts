import type { SocialIntegrationAdapter } from "@/lib/integrations/social/types";

function stripTrailSlash(origin: string) {
  return origin.replace(/\/$/, "");
}

function metaAuthorizeBase(): string {
  const v = process.env.META_OAUTH_DIALOG_VERSION?.trim();
  const ver = v?.length ? v : "v21.0";
  return `https://www.facebook.com/${ver}/dialog/oauth`;
}

export const instagramSocialAdapter: SocialIntegrationAdapter = {
  id: "instagram",
  displayName: "Instagram",
  capabilities: ["publish", "schedule", "analytics"],

  async initiateConnection(input) {
    const clientId = process.env.META_APP_ID?.trim();
    if (!clientId) {
      throw new Error("META_APP_ID is not configured");
    }

    const origin = stripTrailSlash(input.appOrigin);
    const oauthRedirectUri = `${origin}/auth/callback/meta`;
    const state = `${input.workspaceId}|instagram|${input.oauthStateNonce}`;

    const url = new URL(metaAuthorizeBase());
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", oauthRedirectUri);
    url.searchParams.set(
      "scope",
      "instagram_basic,instagram_manage_insights,instagram_content_publish,pages_show_list,pages_read_engagement"
    );
    url.searchParams.set("state", state);
    url.searchParams.set("response_type", "code");

    return {
      kind: "oauth_redirect",
      authorizationUrl: url.toString(),
    };
  },
};
