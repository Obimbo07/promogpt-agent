import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { SocialAnalyticsSection } from "@/components/analytics/social-analytics-section";

export default function AnalyticsPage() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Analytics</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Dynamic charts and metric cards wired for future Recharts dashboards.
        </p>
      </div>

      <Tabs defaultValue="engagement">
        <TabsList className="h-auto rounded-xl p-1">
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>
        <TabsContent value="engagement" className="mt-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Reach lift", "+18%", "Organic + paid"],
              ["CTR pulse", "4.1%", "+0.8pt vs cohort"],
              ["Conversion", "12.9%", "AI refined audiences"],
            ].map(([label, value, context]) => (
              <div
                key={label}
                className="rounded-2xl border border-border/70 bg-muted/35 p-5 shadow-elevated"
              >
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="font-display mt-2 text-3xl font-semibold tabular-nums">{value}</p>
                <p className="mt-3 text-xs text-muted-foreground">{context}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-2xl border border-dashed border-border/80 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            Chart overlays land here · hook Tremor/Recharts dashboards per tenant.
          </div>
        </TabsContent>
        <TabsContent value="social" className="mt-6">
          <SocialAnalyticsSection />
          <div className="mt-8 rounded-2xl border border-border/70 bg-card/85 p-6 text-sm text-muted-foreground backdrop-blur-sm">
            Sentiment and velocity views can extend this feed as we add more providers and chart layers.
          </div>
        </TabsContent>
        <TabsContent value="automation" className="mt-6">
          <div className="rounded-2xl border border-border/70 bg-card/85 p-6 text-sm text-muted-foreground backdrop-blur-sm">
            Automation ladders, SLA chips, anomaly radar — wired to orchestration telemetry in future releases.
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
