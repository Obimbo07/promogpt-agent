/** OAuth popup completion — `postMessage` to `window.opener` then close (all social providers). */

export type OAuthPopupPayload =
  | { source: "promogpt-oauth"; ok: true; workspaceId: string; provider: string; notice?: string }
  | {
      source: "promogpt-oauth";
      ok: false;
      workspaceId?: string | null;
      provider?: string | null;
      error: string;
    };

/** Escape closes script tag injection when embedding JSON in HTML. */
function jsonForInlineScript(payload: OAuthPopupPayload) {
  return JSON.stringify(payload).replace(/</g, "\\u003c");
}

export function oauthPopupResponse(payload: OAuthPopupPayload): Response {
  const body = `<!DOCTYPE html><html lang="en"><meta charset="utf-8"/><body><script>
(function(){
var p=${jsonForInlineScript(payload)};
try{ if(window.opener){ window.opener.postMessage(p,'*'); } }catch(_){}
setTimeout(function(){ try{window.close()}catch(__){}},100);
})();
</script><p style="font:14px sans-serif;color:#444">Completing login… You can close this window.</p></body></html>`;

  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
