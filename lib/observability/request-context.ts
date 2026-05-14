/** Minimal request correlation hooks before OpenTelemetry is wired globally. */

export function createRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function logApiEvent(payload: Record<string, unknown>) {
  if (process.env.NODE_ENV === "development") {
    console.info("[promogpt-agent]", JSON.stringify(payload));
  }
}
