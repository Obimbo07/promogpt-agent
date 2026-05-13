"use client";

import { useCallback, useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

function CanvasInner() {
  const nodes = useMemo<Node[]>(
    () => [
      {
        id: "ingest",
        position: { x: 48, y: 80 },
        data: { label: "Content ingest" },
        style: {
          borderRadius: "12px",
          fontSize: 13,
          fontWeight: 600,
          padding: "10px 14px",
          background: "var(--surface-elevated)",
          border: "1px solid color-mix(in srgb, var(--accent-secondary) 45%, var(--border))",
          boxShadow: "0 0 18px color-mix(in srgb, var(--accent-secondary) 25%, transparent)",
        },
      },
      {
        id: "agent",
        position: { x: 340, y: 40 },
        data: { label: "Promotion agent" },
        style: {
          borderRadius: "12px",
          fontSize: 13,
          fontWeight: 600,
          padding: "10px 14px",
          background: "linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 22%, var(--surface)) 0%, var(--surface-elevated) 100%)",
          border: "1px solid color-mix(in srgb, var(--accent-primary) 50%, transparent)",
          boxShadow: "0 0 22px color-mix(in srgb, var(--accent-primary) 30%, transparent)",
        },
      },
      {
        id: "deploy",
        position: { x: 332, y: 200 },
        data: { label: "Omni-channel deploy" },
        style: {
          borderRadius: "12px",
          fontSize: 13,
          fontWeight: 600,
          padding: "10px 14px",
          background: "var(--surface-elevated)",
          border: "1px solid var(--border)",
        },
      },
    ],
    []
  );

  const edgesInitial = useMemo<Edge[]>(
    () => [
      {
        id: "ingest-agent",
        source: "ingest",
        target: "agent",
        animated: true,
        style: {
          stroke: "var(--accent-secondary)",
          strokeWidth: 2,
        },
      },
      {
        id: "agent-deploy",
        source: "agent",
        target: "deploy",
        animated: true,
        style: {
          stroke: "var(--accent-primary)",
          strokeWidth: 2,
        },
      },
    ],
    []
  );

  const [nodesState, , onNodesChange] = useNodesState(nodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(edgesInitial);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <ReactFlow
      nodes={nodesState}
      edges={edgesState}
      fitView
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      defaultEdgeOptions={{ zIndex: 1 }}
      proOptions={{ hideAttribution: true }}
      style={{ borderRadius: "var(--radius-card-lg)" }}
    >
      <Background gap={28} color="color-mix(in srgb, var(--accent-secondary) 18%, transparent)" />
      <MiniMap zoomable className="!rounded-xl !border !border-border/80 dark:!invert" />
      <Controls position="bottom-right" />
    </ReactFlow>
  );
}

export function WorkflowCanvas() {
  return (
    <div className="h-[calc(100svh-8.5rem)] min-h-[480px] w-full overflow-hidden rounded-2xl border border-border bg-background">
      <ReactFlowProvider>
        <CanvasInner />
      </ReactFlowProvider>
    </div>
  );
}
