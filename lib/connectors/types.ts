/** Social connector contract (north star aligns with roadmap social integrations). */

export type ConnectorCapability = "publish" | "schedule" | "analytics";

export type ScheduledPostPayload = {
  text: string;
  mediaUrls?: string[];
  scheduledFor?: string;
};

export interface SocialConnector {
  readonly id:
    | "linkedin"
    | "x"
    | "telegram"
    | "facebook"
    | "instagram"
    | "tiktok"
    | "youtube"
    | string;
  readonly displayName: string;
  capabilities: ConnectorCapability[];

  /** OAuth entrypoint URL for hosted flows — stub until implemented. */
  getAuthorizationUrl(_input: {
    workspaceId: string;
    redirectUri: string;
    appOrigin?: string;
  }): Promise<string>;

  refreshToken?(credentialsRef: string): Promise<{ credentialsRef: string }>;

  publishPost?(input: ScheduledPostPayload): Promise<{ remoteId: string }>;
}
