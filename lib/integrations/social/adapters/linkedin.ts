import type { SocialIntegrationAdapter } from "@/lib/integrations/social/types";

function stripTrailSlash(origin: string) {
  return origin.replace(/\/$/, "");
}

export const linkedinSocialAdapter: SocialIntegrationAdapter = {
  id: "linkedin",
  displayName: "LinkedIn",
  capabilities: ["publish", "schedule", "analytics"],

  async initiateConnection(input) {
    const clientId = process.env.LINKEDIN_CLIENT_ID?.trim();
    if (!clientId) {
      throw new Error("LINKEDIN_CLIENT_ID is not configured");
    }

    const origin = stripTrailSlash(input.appOrigin);
    const redirectUri = `${origin}/auth/callback/linkedin`;
    const state = `${input.workspaceId}|linkedin|${input.oauthStateNonce}`;

    const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    /** OpenID + member posting; add w_organization_social for company pages when needed. */
    url.searchParams.set("scope", "openid profile email w_member_social");

    return {
      kind: "oauth_redirect",
      authorizationUrl: url.toString(),
    };
  },
};
