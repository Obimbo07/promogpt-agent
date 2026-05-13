import { WorkflowCanvas } from "@/components/workflows/workflow-canvas";

export default function WorkflowsPage() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Workflow builder
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Nodes, glowing edges, and live execution previews — scaffolded for collaborative automation design.
        </p>
      </div>
      <WorkflowCanvas />
    </section>
  );
}
