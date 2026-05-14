import type { SocialIntegrationAdapter } from "@/lib/integrations/social/types";

export const xSocialAdapter: SocialIntegrationAdapter = {
  id: "x",
  displayName: "X (Twitter)",
  capabilities: ["publish", "schedule", "analytics"],

  async initiateConnection(input) {
    const url = new URL("https://twitter.com/i/oauth2/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", "CONFIGURE_TWITTER_CLIENT_ID");
    url.searchParams.set(
      "redirect_uri",
      `${input.redirectUri}?workspace=${encodeURIComponent(input.workspaceId)}&provider=x`
    );
    url.searchParams.set("scope", "tweet.read tweet.write offline.access users.read");
    url.searchParams.set("state", `workspace:${input.workspaceId}:${input.oauthStateNonce}`);
    url.searchParams.set("code_challenge", "promogpt_placeholder");
    url.searchParams.set("code_challenge_method", "plain");

    return {
      kind: "oauth_redirect",
      authorizationUrl: url.toString(),
    };
  },
};
