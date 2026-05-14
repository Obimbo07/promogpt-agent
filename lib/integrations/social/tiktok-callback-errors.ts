/**
 * TikTok Login Kit sometimes redirects with ?error=… when consent fails (sandbox rules, etc.).
 * @see https://developers.tiktok.com/doc/add-a-sandbox/
 */
export function formatTikTokAuthorizeCallbackError(
  errorCode: string | null,
  errorDescription: string | null
): string {
  const code = (errorCode ?? "").trim();
  const desc = (errorDescription ?? "").replace(/\+/g, " ").trim();

  if (code === "non_sandbox_target" || /\bnon_sandbox_target\b/i.test(desc)) {
    return [
      "Sandbox TikTok apps only allow accounts registered as Target users.",
      "In developers.tiktok.com: open your app → Sandbox → Sandbox settings → Target users → Add account (the TikTok login you use).",
      "Or submit the app and use Production credentials so any user can authorize.",
    ].join(" ");
  }

  if (desc.length > 0) {
    return desc;
  }
  if (code.length > 0) {
    return code;
  }
  return "TikTok authorization was denied.";
}
