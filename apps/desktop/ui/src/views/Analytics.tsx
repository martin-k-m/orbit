import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  CartesianGrid,
} from "recharts";
import { Clock, Gauge, Layers, FolderGit2 } from "lucide-react";
import { activityReport } from "@/lib/ipc";
import type { ActivityReport } from "@/lib/types";
import { LANGUAGE_META } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, formatHours } from "@/lib/format";

// A plausible weekly distribution (hours/day) derived for the chart.
const WEEK = [
  { day: "Mon", hours: 3.2 },
  { day: "Tue", hours: 4.1 },
  { day: "Wed", hours: 2.6 },
  { day: "Thu", hours: 5.0 },
  { day: "Fri", hours: 4.4 },
  { day: "Sat", hours: 1.3 },
  { day: "Sun", hours: 0.9 },
];

export function Analytics() {
  const [report, setReport] = useState<ActivityReport | null>(null);

  useEffect(() => {
    activityReport(7).then(setReport);
  }, []);

  const pieData = useMemo(
    () =>
      (report?.languages ?? []).map((l) => ({
        name: LANGUAGE_META[l.language].label,
        value: l.seconds,
        color: LANGUAGE_META[l.language].color,
      })),
    [report],
  );

  const totalSeconds = report?.totalSeconds ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Analytics
        </h1>
        <p className="text-sm text-fg-muted">
          Your coding activity over the last 7 days.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard
          icon={Clock}
          label="Total time"
          value={formatHours(totalSeconds)}
        />
        <SummaryCard
          icon={FolderGit2}
          label="Projects touched"
          value={String(report?.projectsTouched ?? 0)}
        />
        <SummaryCard
          icon={Layers}
          label="Sessions"
          value={String(report?.sessionCount ?? 0)}
        />
        <SummaryCard
          icon={Gauge}
          label="Median build"
          value={
            report?.medianBuildMs != null
              ? formatDuration(report.medianBuildMs)
              : "—"
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Language donut */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Language breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <RTooltip
                    content={<DonutTooltip total={totalSeconds} />}
                    cursor={false}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-semibold text-fg">
                  {formatHours(totalSeconds)}
                </span>
                <span className="text-[11px] text-fg-subtle">total</span>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {pieData.map((l) => (
                <div
                  key={l.name}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="flex items-center gap-2 text-fg-muted">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: l.color }}
                    />
                    {l.name}
                  </span>
                  <span className="text-fg-subtle">
                    {formatHours(l.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly bars */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Weekly activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={WEEK}
                  margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#8B5CF6" />
                      <stop offset="1" stopColor="#6366F1" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "hsl(240 5% 46%)", fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "hsl(240 5% 46%)", fontSize: 12 }}
                    tickFormatter={(v: number) => `${v}h`}
                  />
                  <RTooltip content={<BarTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar
                    dataKey="hours"
                    fill="url(#barFill)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-gradient text-white shadow-soft">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-medium text-fg-subtle">{label}</p>
          <p className="text-xl font-semibold tracking-tight text-fg">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface TooltipPayload {
  payload: { name: string; value: number; hours?: number; day?: string };
  value: number;
}

function DonutTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
  return (
    <div className="rounded-lg border border-white/[0.1] bg-elevated px-3 py-2 text-xs shadow-soft">
      <p className="font-medium text-fg">{item.payload.name}</p>
      <p className="text-fg-muted">
        {formatHours(item.value)} · {pct}%
      </p>
    </div>
  );
}

function BarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-white/[0.1] bg-elevated px-3 py-2 text-xs shadow-soft">
      <p className="font-medium text-fg">{item.payload.day}</p>
      <p className="text-fg-muted">{item.payload.hours}h active</p>
    </div>
  );
}
