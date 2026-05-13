"use client";

import dynamic from "next/dynamic";

const DashboardView = dynamic(
  () =>
    import("@/components/dashboard/dashboard-view").then((m) => m.DashboardView),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="h-10 max-w-xs animate-pulse rounded-lg bg-muted/50" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((key) => (
            <div key={key} className="h-28 animate-pulse rounded-2xl bg-muted/40" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="h-[320px] animate-pulse rounded-2xl bg-muted/40 lg:col-span-7" />
          <div className="h-[320px] animate-pulse rounded-2xl bg-muted/40 lg:col-span-5" />
        </div>
      </div>
    ),
  }
);

export function DashboardPageClient() {
  return <DashboardView />;
}
