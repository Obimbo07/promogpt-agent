import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden min-h-[100vh]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.45] dark:opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(to right, color-mix(in srgb, var(--accent-primary) 18%, transparent) 1px, transparent 1px),
            linear-gradient(to bottom, color-mix(in srgb, var(--accent-secondary) 14%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          animation: "grid-shift 48s linear infinite",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--accent-primary) 55%, transparent), transparent 70%)",
          animation: "pulse-glow 6s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--accent-secondary) 45%, transparent), transparent 70%)",
          animation: "pulse-glow 8s ease-in-out infinite reverse",
        }}
      />

      <header className="relative z-20 flex justify-end gap-6 px-6 py-6 sm:px-10">
        <Link
          href="/auth/login"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-accent-secondary"
        >
          Sign in
        </Link>
        <Link
          href="/auth/sign-up"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-accent-secondary"
        >
          Create account
        </Link>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-accent-secondary"
        >
          Workspace
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center sm:px-10">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface/60 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-[var(--glass-blur)]">
          <span
            className="inline-block h-2 w-2 rounded-full bg-accent-success"
            style={{
              boxShadow:
                "0 0 12px color-mix(in srgb, var(--accent-success) 60%, transparent)",
            }}
          />
          AI runtime online
        </p>

        <h1 className="font-display max-w-3xl text-balance text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Build autonomous AI marketing systems.
        </h1>

        <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          Mission control for digital operations — orchestrate workflows, agents, and automation in one reactive,
          premium workspace.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link
            href="/dashboard"
            className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-xl bg-gradient-to-r from-accent-primary via-violet-600 to-accent-primary px-8 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
          >
            Open command center
          </Link>
          <a
            className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-xl border border-border bg-surface/40 px-8 text-sm font-medium text-foreground backdrop-blur-[var(--glass-blur)] transition-colors hover:border-accent-secondary/50 hover:text-accent-secondary"
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>

        <div className="mt-16 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
          {[
            { label: "Automation score", value: "98", hint: "Workflow efficiency" },
            { label: "Active agents", value: "12", hint: "Live orchestration" },
            { label: "Token usage", value: "1.2M", hint: "This period" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-border bg-surface/50 p-5 text-left shadow-elevated backdrop-blur-[var(--glass-blur)] transition-[box-shadow,transform] hover:shadow-glow hover:-translate-y-0.5"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {item.label}
              </p>
              <p className="font-display mt-2 text-3xl font-semibold tabular-nums text-foreground">{item.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.hint}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
