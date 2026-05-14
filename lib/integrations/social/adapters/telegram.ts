import type { SocialIntegrationAdapter } from "@/lib/integrations/social/types";

export const telegramSocialAdapter: SocialIntegrationAdapter = {
  id: "telegram",
  displayName: "Telegram",
  capabilities: ["publish", "schedule", "analytics"],

  async initiateConnection(input) {
    void input.oauthStateNonce;
    const botFatherUrl = "https://core.telegram.org/bots/tutorial";
    const dashboardUrl = `${input.appOrigin.replace(/\/$/, "")}/settings?telegram_workspace=${encodeURIComponent(input.workspaceId)}`;

    return {
      kind: "manual_setup",
      instructions:
        `Telegram uses bot tokens + optional OAuth login widgets. Create a bot via BotFather (${botFatherUrl}), ` +
        `store the token via your secure admin flow (planned), then finish linking in PromoGPT settings (${dashboardUrl}).`,
    };
  },
};
