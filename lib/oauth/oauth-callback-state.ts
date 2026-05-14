import { z } from "zod";

/** State format: `{workspaceUuid}|{provider}|{nonce}` (from social adapters). */
export function parsePipeOAuthState(raw: string | null): {
  workspaceId: string;
  provider: string;
  nonce: string;
} | null {
  if (!raw) {
    return null;
  }
  const parts = raw.split("|");
  if (parts.length !== 3) {
    return null;
  }
  const [workspaceId, provider, nonce] = parts;
  const uuid = z.string().uuid().safeParse(workspaceId);
  if (!uuid.success || !provider || nonce.length < 16) {
    return null;
  }
  return { workspaceId: uuid.data, provider, nonce };
}
