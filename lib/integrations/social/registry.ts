import type { SocialIntegrationAdapter, SocialProviderId } from "@/lib/integrations/social/types";

import { facebookSocialAdapter } from "@/lib/integrations/social/adapters/facebook";
import { instagramSocialAdapter } from "@/lib/integrations/social/adapters/instagram";
import { linkedinSocialAdapter } from "@/lib/integrations/social/adapters/linkedin";
import { telegramSocialAdapter } from "@/lib/integrations/social/adapters/telegram";
import { tiktokSocialAdapter } from "@/lib/integrations/social/adapters/tiktok";
import { xSocialAdapter } from "@/lib/integrations/social/adapters/x";

const list: SocialIntegrationAdapter[] = [
  tiktokSocialAdapter,
  facebookSocialAdapter,
  instagramSocialAdapter,
  xSocialAdapter,
  telegramSocialAdapter,
  linkedinSocialAdapter,
];

const byId = Object.fromEntries(list.map((a) => [a.id, a])) as Record<
  SocialProviderId,
  SocialIntegrationAdapter
>;

export function getSocialAdapter(provider: string): SocialIntegrationAdapter | null {
  return byId[provider as SocialProviderId] ?? null;
}

export function listCoreSocialAdapters(): SocialIntegrationAdapter[] {
  return list;
}
