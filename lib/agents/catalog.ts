/** Pre-built workflow definitions = marketing agents (one workflow row per agent). */

export const AGENT_WORKFLOW_SLUGS = [
  "agent-content-research",
  "agent-post-drafts",
  "agent-schedule-coach",
  "agent-marketing-report",
] as const;

export type AgentWorkflowSlug = (typeof AGENT_WORKFLOW_SLUGS)[number];

export type AgentWorkflowCatalogEntry = {
  slug: AgentWorkflowSlug;
  name: string;
  kind: string;
  description: string;
  definition: Record<string, unknown>;
};

export const AGENT_WORKFLOW_CATALOG: AgentWorkflowCatalogEntry[] = [
  {
    slug: "agent-content-research",
    name: "Research agent",
    kind: "promogpt.agent.research",
    description:
      "Synthesizes themes from your best- and worst-performing posts, suggests topics and research angles, and flags gaps to explore next.",
    definition: {
      v: 1,
      kind: "promogpt.agent.research",
      capabilities: ["topic_trends", "performance_gaps", "competitor_style_free_questions"],
    },
  },
  {
    slug: "agent-post-drafts",
    name: "Post draft agent",
    kind: "promogpt.agent.post_draft",
    description:
      "Produces channel-specific copy variants (TikTok / Instagram / Facebook Page) aligned with what already worked in your ingested data. Publishing still happens in-platform.",
    definition: {
      v: 1,
      kind: "promogpt.agent.post_draft",
      capabilities: ["caption_variants", "hook_lines", "cta_options"],
    },
  },
  {
    slug: "agent-schedule-coach",
    name: "Schedule coach",
    kind: "promogpt.agent.schedule",
    description:
      "Builds a rolling calendar plan with cadence and themes per channel. Parsed slots land on the workspace calendar as proposed items—confirm them there. Native publish + Google Calendar mirrors ship incrementally.",
    definition: {
      v: 1,
      kind: "promogpt.agent.schedule",
      capabilities: ["cadence", "content_pillars", "experiment_slots"],
    },
  },
  {
    slug: "agent-marketing-report",
    name: "Marketing report agent",
    kind: "promogpt.agent.marketing_report",
    description:
      "Compares recent pulls and post snapshots to prior runs to highlight what is improving, what is flat, and concrete next actions.",
    definition: {
      v: 1,
      kind: "promogpt.agent.marketing_report",
      capabilities: ["trend_compare", "kpi_narrative", "improvement_backlog"],
    },
  },
];

export function resolveAgentKind(slug: string, definitionJson: Record<string, unknown>): string {
  if (typeof definitionJson.kind === "string" && definitionJson.kind.length > 0) {
    return definitionJson.kind;
  }

  const hit = AGENT_WORKFLOW_CATALOG.find((a) => a.slug === slug);
  return hit?.kind ?? slug;
}
