import type { SocialIntegrationAdapter } from "@/lib/integrations/social/types";
import { pkceCodeChallengeS256 } from "@/lib/oauth/pkce";

function stripTrailSlash(origin: string) {
  return origin.replace(/\/$/, "");
}

export const tiktokSocialAdapter: SocialIntegrationAdapter = {
  id: "tiktok",
  displayName: "TikTok",
  capabilities: ["publish", "schedule", "analytics"],

  async initiateConnection(input) {
    const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim();
    if (!clientKey) {
      throw new Error("TIKTOK_CLIENT_KEY is not configured");
    }

    const origin = stripTrailSlash(input.appOrigin);
    const redirectUri = `${origin}/auth/callback/tiktok`;
    const state = `${input.workspaceId}|tiktok|${input.oauthStateNonce}`;

    const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
    url.searchParams.set("client_key", clientKey);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    /** Minimum scopes; extend in TikTok Developer Portal for video.upload / analytics. */
    url.searchParams.set("scope", "user.info.basic,video.list");

    if (input.pkceCodeVerifier) {
      url.searchParams.set("code_challenge", pkceCodeChallengeS256(input.pkceCodeVerifier));
      url.searchParams.set("code_challenge_method", "S256");
    }

    return {
      kind: "oauth_redirect",
      authorizationUrl: url.toString(),
    };
  },
};
