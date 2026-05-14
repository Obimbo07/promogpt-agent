import type { PromoGPTBrowserClientOptions } from "./types";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** Minimal typed client for REST `/api/v1/*` routes (foundation for eventual `packages/sdk`). */
export class PromoGPTAgentClient {
  constructor(
    private readonly options: PromoGPTBrowserClientOptions = {}
  ) {}

  async listOrganizations(init?: RequestInit) {
    return this.fetchJson("/api/v1/organizations", init);
  }

  async createOrganization(
    body: { name: string; slug?: string },
    init?: RequestInit
  ) {
    return this.fetchJson("/api/v1/organizations", {
      ...init,
      method: "POST",
      headers: { "Content-Type": "application/json", ...init?.headers },
      body: JSON.stringify(body),
    });
  }

  async completions(
    body: { model?: string; messages: ChatMessage[]; temperature?: number },
    init?: RequestInit
  ) {
    return this.fetchJson("/api/v1/ai/completions", {
      ...init,
      method: "POST",
      headers: { "Content-Type": "application/json", ...init?.headers },
      body: JSON.stringify(body),
    });
  }

  async createWorkflowExecution(
    body: { workflowDefinitionId: string; payload?: Record<string, unknown> },
    init?: RequestInit
  ) {
    return this.fetchJson("/api/v1/workflow-runs", {
      ...init,
      method: "POST",
      headers: { "Content-Type": "application/json", ...init?.headers },
      body: JSON.stringify(body),
    });
  }

  async listWorkflows(workspaceId: string, init?: RequestInit) {
    const q = new URLSearchParams({ workspace_id: workspaceId });
    return this.fetchJson(`/api/v1/workflows?${q}`, init);
  }

  async createWorkflow(
    body: {
      workspaceId: string;
      name: string;
      slug?: string;
      definition?: Record<string, unknown>;
    },
    init?: RequestInit
  ) {
    return this.fetchJson("/api/v1/workflows", {
      ...init,
      method: "POST",
      headers: { "Content-Type": "application/json", ...init?.headers },
      body: JSON.stringify(body),
    });
  }

  async listConnectorCatalog(init?: RequestInit) {
    return this.fetchJson("/api/v1/connectors", init);
  }

  async createCheckoutSession(
    body: { organizationId: string },
    init?: RequestInit
  ) {
    return this.fetchJson("/api/v1/billing/checkout-session", {
      ...init,
      method: "POST",
      headers: { "Content-Type": "application/json", ...init?.headers },
      body: JSON.stringify(body),
    });
  }

  private async fetchJson(path: string, init?: RequestInit) {
    const base =
      this.options.baseUrl?.replace(/\/$/, "") ||
      (typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000");

    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        ...(this.options.headers ?? {}),
        ...init?.headers,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw Object.assign(new Error(`API ${res.status}`), {
        status: res.status,
        data,
      });
    }

    return data;
  }
}
