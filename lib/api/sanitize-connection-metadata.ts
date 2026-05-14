/**
 * Keys stored on `connector_accounts.metadata` for server-side OAuth (never expose to clients).
 */
const SERVER_ONLY_METADATA_KEYS = new Set(["oauth_code_verifier", "oauth_redirect_uri"]);

export function sanitizeConnectionMetadataForApi(metadata: unknown): unknown {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return metadata;
  }
  const copy = { ...(metadata as Record<string, unknown>) };
  for (const k of SERVER_ONLY_METADATA_KEYS) {
    delete copy[k];
  }
  return copy;
}
