"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type UsageSeriesPoint = {
  day: string;
  tokens: number;
};

export function TokenUsageChart(props: {
  series: UsageSeriesPoint[];
  emptyMessage?: string;
}) {
  const { series, emptyMessage } = props;

  const normalized = series.map((p) => ({
    day: p.day.slice(5),
    tokens: p.tokens,
  }));

  if (series.length === 0) {
    return (
      <div className="flex min-h-[180px] w-full flex-col justify-center rounded-xl border border-border/70 bg-muted/20 px-4 py-8">
        <p className="text-center text-sm text-muted-foreground">
          {emptyMessage ?? "No data for this range."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border/70 bg-muted/20 p-2 pt-6">
      <div className="h-[220px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={normalized} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="fillTokensLive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="4 10"
              stroke="color-mix(in srgb, var(--border) 55%, transparent)"
            />
            <XAxis
              dataKey="day"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                fontSize: 12,
                boxShadow: "var(--shadow-elevated)",
              }}
              labelStyle={{ color: "var(--muted-foreground)" }}
              formatter={(value) => [
                typeof value === "number" ? value.toLocaleString() : "—",
                "Billable units",
              ]}
            />
            <Area
              type="monotone"
              dataKey="tokens"
              stroke="var(--accent-primary)"
              strokeWidth={2}
              fill="url(#fillTokensLive)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: "var(--accent-secondary)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
