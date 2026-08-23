import { Link } from 'react-router-dom';
import {
  Plus,
  Briefcase,
  TrendingUp,
  Award,
  Calendar,
  Upload,
  Sparkles,
  LibraryBig,
  BarChart3,
} from 'lucide-react';
import {
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
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useDashboardAnalytics } from '../hooks/useAnalytics';
import { useResumeLibrary } from '../hooks/useResume';
import type { Job } from '@repo/shared';
import { EmptyState, LoadingState } from '../components/common/States';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b'];

export function Dashboard() {
  const analytics = useDashboardAnalytics();
  const library = useResumeLibrary({ sort: 'newest' });

  if (analytics.isLoading || !analytics.data) {
    return <LoadingState title="Loading dashboard" description="Fetching jobs, scores, and trend data." />;
  }

  const data = analytics.data;
  const statusData = Object.entries(data.jobsByStatus).map(([name, value]) => ({ name, value }));
  const scoreTrend = data.scoreTrend.deltaPercent;
  const applicationTrend = data.applicationTrends.deltaPercent;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">Dashboard</Badge>
            <Badge variant="info">Professional SaaS workspace</Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-card-foreground">
            Application command center
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Monitor job progress, resume quality, and application throughput with compact, honest metrics.
          </p>
        </div>
        <Link to="/jobs">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Job
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Total Jobs"
          value={data.totalJobs}
          trend={data.applicationTrends.deltaPercent}
          helper={trendHelper(data.applicationTrends.current, data.applicationTrends.previous)}
          icon={Briefcase}
        />
        <KpiCard
          label="Applications"
          value={data.applied}
          trend={applicationTrend}
          helper="This month"
          icon={TrendingUp}
        />
        <KpiCard
          label="Interviews"
          value={data.recruiterScreens + data.technicalInterviews + data.finalInterviews}
          trend={null}
          helper="Not enough data"
          icon={Calendar}
        />
        <KpiCard
          label="Offers"
          value={data.offers}
          trend={null}
          helper="Current pipeline"
          icon={Award}
        />
        <KpiCard
          label="Avg Match Score"
          value={data.averageScore ?? '—'}
          trend={scoreTrend}
          helper={data.scoreTrend.current === null ? 'Not enough data' : 'This month'}
          icon={BarChart3}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickAction
          icon={Plus}
          label="Add Job"
          href="/jobs"
          description="Track a new application"
        />
        <QuickAction
          icon={Upload}
          label="Upload Master Resume"
          href="/resume"
          description="Start from your source resume"
        />
        <QuickAction
          icon={Sparkles}
          label="Generate Resume"
          href="/jobs"
          description="Tailor to an active job"
        />
        <QuickAction
          icon={LibraryBig}
          label="View Resume Library"
          href="/resume"
          description="Browse master and company versions"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Applications Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
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
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="rgb(var(--primary))"
                    strokeWidth={3}
                    dot={false}
                  />
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
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={92}>
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>Resume Library Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            {library.isLoading ? (
              <LoadingState title="Loading documents" />
            ) : !library.data ? (
              <EmptyState
                title="No documents yet"
                description="Upload a master resume to populate the library."
                action={
                  <Link to="/resume">
                    <Button variant="secondary">Open Resume Library</Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {library.data.recentDocuments.slice(0, 4).map((document) => (
                  <div
                    key={document.id}
                    className="flex items-start justify-between rounded-2xl border border-border bg-muted/30 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-card-foreground">
                        {document.company ?? document.title ?? document.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {document.type} {document.versionNumber ? `v${document.versionNumber}` : ''}
                      </p>
                    </div>
                    <Badge variant={document.type === 'MASTER' ? 'primary' : 'success'}>
                      {document.score ?? 'PDF'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentJobs.length === 0 ? (
              <EmptyState
                title="No jobs yet"
                description="Start tracking applications to see them here."
                action={
                  <Link to="/jobs">
                    <Button variant="secondary">Add Your First Job</Button>
                  </Link>
                }
              />
              ) : (
                data.recentJobs.map((job: Job) => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3 transition hover:border-primary/40 hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-card-foreground">{job.company}</p>
                      <p className="truncate text-sm text-muted-foreground">{job.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">
                        {job.score ?? '—'}
                        <span className="text-muted-foreground">/100</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{job.status.replace(/_/g, ' ')}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  trend,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  trend: number | null;
  helper: string;
  icon: React.ElementType;
}) {
  const trendLabel =
    trend === null ? 'Not enough data' : `${trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} ${Math.abs(trend)}%`;
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-semibold tracking-tight text-card-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{helper}</p>
          </div>
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {trendLabel}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  label,
  description,
  icon: Icon,
  href,
}: {
  label: string;
  description: string;
  icon: React.ElementType;
  href: string;
}) {
  return (
    <Link to={href} className="group">
      <Card className="h-full transition group-hover:-translate-y-0.5 group-hover:shadow-md">
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-card-foreground">{label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function trendHelper(current: number, previous: number) {
  if (!previous) return 'Not enough data';
  const diff = current - previous;
  return diff >= 0 ? `Up ${diff}` : `Down ${Math.abs(diff)}`;
}
