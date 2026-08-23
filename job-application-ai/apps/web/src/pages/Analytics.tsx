import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { LoadingState } from '../components/common/States';
import { useDashboardAnalytics } from '../hooks/useAnalytics';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b'];

export function Analytics() {
  const { data, isLoading } = useDashboardAnalytics();

  if (isLoading || !data) {
    return <LoadingState title="Loading analytics" description="Calculating application and score trends." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="primary">Analytics</Badge>
          <Badge variant="info">No fabricated metrics</Badge>
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-card-foreground">
          Application performance
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Interview and offer rates are derived from the current job history. If there is not enough history, the UI says so.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Interview Conversion Rate" value={formatPercent(data.interviewConversionRate)} />
        <MetricCard label="Offer Conversion Rate" value={formatPercent(data.offerConversionRate)} />
        <MetricCard label="Applications This Month" value={data.applicationsThisMonth} />
        <MetricCard label="Average Match Score" value={data.averageScore ?? 'Not enough data'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Applications Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.applicationsOverTime}>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} hide />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 14,
                      borderColor: 'rgb(var(--border))',
                      backgroundColor: 'rgb(var(--card))',
                      color: 'rgb(var(--card-foreground))',
                    }}
                  />
                  <Line type="monotone" dataKey="count" stroke="rgb(var(--primary))" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jobs by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={Object.entries(data.jobsByStatus).map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}>
                    {Object.entries(data.jobsByStatus).map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 14,
                      borderColor: 'rgb(var(--border))',
                      backgroundColor: 'rgb(var(--card))',
                      color: 'rgb(var(--card-foreground))',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.scoreDistribution}>
                <XAxis dataKey="range" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    borderColor: 'rgb(var(--border))',
                    backgroundColor: 'rgb(var(--card))',
                    color: 'rgb(var(--card-foreground))',
                  }}
                />
                <Bar dataKey="count" fill="rgb(var(--success))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-card-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
