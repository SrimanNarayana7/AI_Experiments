import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Sparkles,
  Loader2,
  Download,
  Eye,
  GitCompareArrows,
  MoveRight,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { JobAnalysis, SkillMatch, TimelineEvent, ResumeVersion, Job } from '@repo/shared';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { ScoreCard } from '../components/analysis/ScoreCard';
import { ScoreBreakdownCard } from '../components/analysis/ScoreBreakdown';
import { Timeline } from '../components/common/Timeline';
import { LoadingState, ErrorState } from '../components/common/States';
import { ResumePreviewModal, VersionCompareDialog } from '../components/resume/ResumeViewer';
import { useJob, useUpdateJobStatus } from '../hooks/useJobs';
import { api } from '../services/api';
import { useToast } from '../context/app-context';
import { Dialog } from '../components/ui/Dialog';
import { Select } from '../components/ui/Select';

const tabs = ['overview', 'analysis', 'versions', 'timeline', 'notes'] as const;

export function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: job, isLoading, error } = useJob(id ?? '');
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('overview');

  if (isLoading) {
    return <LoadingState title="Loading job" description="Retrieving job details and resume versions." />;
  }

  if (!job || error) {
    return (
      <ErrorState
        title="Job not found"
        description="We couldn’t load this job right now."
        onRetry={() => navigate('/jobs')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl border border-border bg-card p-2 text-muted-foreground transition hover:text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="primary">{job.status.replace(/_/g, ' ')}</Badge>
            <Badge variant={job.priority === 'URGENT' || job.priority === 'HIGH' ? 'destructive' : 'default'}>
              {job.priority}
            </Badge>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-card-foreground">
            {job.company}
          </h1>
          <p className="mt-1 text-base text-muted-foreground">{job.title}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <HeaderMetric label="Resume Match" value={`${job.score ?? '—'} / 100`} />
        <HeaderMetric label="ATS Readiness" value={`${job.atsScore ?? '—'} / 100`} />
        <HeaderMetric label="Location" value={job.location ?? 'Not specified'} />
        <HeaderMetric label="Applied" value={job.appliedAt ? new Date(job.appliedAt).toLocaleDateString() : 'Pending'} />
      </div>

      <Tabs tabs={tabs.map((tab) => ({ id: tab, label: tabLabel(tab) }))} activeTab={activeTab} onChange={(tab) => setActiveTab(tab as typeof activeTab)} />

      {activeTab === 'overview' && <OverviewTab job={job} />}
      {activeTab === 'analysis' && <AnalysisTab job={job} />}
      {activeTab === 'versions' && <VersionsTab job={job} />}
      {activeTab === 'timeline' && <TimelineTab jobId={job.id} />}
      {activeTab === 'notes' && <NotesTab jobId={job.id} />}
    </div>
  );
}

function OverviewTab({ job }: { job: Job }) {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [moveOpen, setMoveOpen] = useState(false);
  const updateStatus = useUpdateJobStatus();
  const generate = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/jobs/${job.id}/generate-resume`);
      return data.data as ResumeVersion;
    },
    onSuccess: () => {
      pushToast({
        title: 'Resume generated',
        description: `${job.company} — ${job.title}`,
        tone: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['jobs', job.id] });
      queryClient.invalidateQueries({ queryKey: ['resume-versions', job.id] });
    },
  });
  const analyze = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/api/jobs/${job.id}/analyze`);
      return data.data as JobAnalysis;
    },
    onSuccess: () => {
      pushToast({ title: 'JD analysis completed', description: job.company, tone: 'success' });
      queryClient.invalidateQueries({ queryKey: ['jobs', job.id] });
    },
  });
  const moveStatus = async (status: Job['status']) => {
    await updateStatus.mutateAsync({ id: job.id, status });
    setMoveOpen(false);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <InfoBlock label="Job URL" value={job.url ?? 'Not specified'} />
            <InfoBlock label="Employment Type" value={job.employmentType?.replace(/_/g, ' ') ?? 'Not specified'} />
            <InfoBlock label="Salary" value={job.salary ?? 'Not specified'} />
            <InfoBlock label="Latest Resume Version" value={job.latestResumeVersion ? `v${job.latestResumeVersion}` : 'None'} />
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-muted/20 p-4">
            <p className="text-sm font-semibold text-card-foreground">Job Description</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{job.description}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => analyze.mutate()} isLoading={analyze.isPending}>
              <FileText className="mr-2 h-4 w-4" />
              Analyze JD
            </Button>
            <Button onClick={() => generate.mutate()} isLoading={generate.isPending}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Resume
            </Button>
            <Button variant="secondary" onClick={() => setMoveOpen(true)}>
              <MoveRight className="mr-2 h-4 w-4" />
              Move Status
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <ScoreCard score={job.score ?? 0} />
        <Card>
          <CardHeader>
            <CardTitle>Top Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {job.topSkills?.length ? (
                job.topSkills.map((skill) => (
                  <Badge key={skill} variant="primary">
                    {skill}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Analyze the JD to surface matched skills.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        title="Move Job"
        description="Change the application status."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {['BACKLOG', 'SAVED', 'APPLIED', 'RECRUITER_SCREEN', 'TECHNICAL_INTERVIEW', 'FINAL_INTERVIEW', 'OFFER', 'REJECTED'].map(
            (status) => (
              <Button
                key={status}
                variant={job.status === status ? 'primary' : 'secondary'}
                onClick={() => moveStatus(status as Job['status'])}
                isLoading={updateStatus.isPending}
              >
                {status.replace(/_/g, ' ')}
              </Button>
            ),
          )}
        </div>
      </Dialog>
    </div>
  );
}

function AnalysisTab({ job }: { job: Job }) {
  const { data, isLoading } = useQuery<{
    jdAnalysis: JobAnalysis;
    resumeAnalysis: unknown;
    skillMatches: SkillMatch[];
  }>({
    queryKey: ['job-analysis', job.id],
    queryFn: async () => {
      const { data } = await api.post(`/api/jobs/${job.id}/analyze-resume`);
      return data.data;
    },
    enabled: !!job.id,
  });

  if (isLoading) return <LoadingState title="Analyzing job and resume" description="Matching your master resume against the JD." />;
  if (!data) return <ErrorState title="No analysis yet" description="Run JD analysis to see detailed matches." />;

  return (
    <div className="space-y-4">
      <ScoreBreakdownCard
        breakdown={
          job.score
            ? {
                requiredSkills: 0,
                preferredSkills: 0,
                roleAlignment: 0,
                experienceAlignment: 0,
                domainAlignment: 0,
                keywordCoverage: 0,
                atsReadability: job.atsScore ?? 0,
                total: job.score,
              }
            : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>JD Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 lg:grid-cols-2">
            <AnalysisList title="Required Skills" items={data.jdAnalysis.requiredSkills} variant="destructive" />
            <AnalysisList title="Preferred Skills" items={data.jdAnalysis.preferredSkills} variant="primary" />
            <AnalysisList title="Responsibilities" items={data.jdAnalysis.responsibilities} variant="default" />
            <AnalysisList title="Keywords" items={data.jdAnalysis.keywords} variant="info" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skill Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {data.skillMatches.map((match) => (
              <div key={match.id} className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-card-foreground">{match.skill}</p>
                  <Badge
                    variant={
                      match.status === 'MATCHED'
                        ? 'success'
                        : match.status === 'PARTIAL'
                          ? 'warning'
                          : 'destructive'
                    }
                  >
                    {match.status}
                  </Badge>
                </div>
                {match.evidence && <p className="mt-2 text-sm text-muted-foreground">{match.evidence}</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VersionsTab({ job }: { job: Job }) {
  const [previewVersion, setPreviewVersion] = useState<ResumeVersion | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const { data: versions = [], isLoading } = useQuery<ResumeVersion[]>({
    queryKey: ['resume-versions', job.id],
    queryFn: async () => {
      const { data } = await api.get(`/api/jobs/${job.id}/resume-versions`);
      return data.data;
    },
    enabled: !!job.id,
  });

  if (isLoading) return <LoadingState title="Loading versions" description="Fetching generated resumes." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => setCompareOpen(true)} disabled={versions.length < 2}>
          <GitCompareArrows className="mr-2 h-4 w-4" />
          Compare Versions
        </Button>
      </div>

      {versions.length === 0 ? (
        <ErrorState title="No versions yet" description="Generate a resume to start version history." />
      ) : (
        versions.map((version) => (
          <Card key={version.id}>
            <CardContent>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-card-foreground">Version {version.versionNumber}</p>
                    {version.isCurrent && <Badge variant="success">Current</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Score {version.score ?? '—'} / 100 • ATS {version.atsScore ?? '—'} / 100
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Created {new Date(version.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPreviewVersion(version)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                  {version.pdfPath && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => window.location.assign(`/api/resume-versions/${version.id}/download`)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {previewVersion && (
        <ResumePreviewModal
          open={!!previewVersion}
          onClose={() => setPreviewVersion(null)}
          title={`Resume v${previewVersion.versionNumber}`}
          pdfUrl={`/api/resume-versions/${previewVersion.id}/preview`}
          fileName={`Version ${previewVersion.versionNumber}`}
          score={previewVersion.score}
          breakdown={(previewVersion.scoreBreakdown as Record<string, number>) ?? null}
          details={[
            { label: 'Company', value: job.company },
            { label: 'Role', value: job.title },
            { label: 'Version', value: `v${previewVersion.versionNumber}` },
            { label: 'ATS', value: `${previewVersion.atsScore ?? '—'} / 100` },
            { label: 'Created', value: new Date(previewVersion.createdAt).toLocaleDateString() },
          ]}
          onMakeCurrent={async () => {
            await api.post(`/api/resume-versions/${previewVersion.id}/make-current`);
            setPreviewVersion(null);
          }}
        />
      )}

      <VersionCompareDialog open={compareOpen} onClose={() => setCompareOpen(false)} versions={versions} />
    </div>
  );
}

function TimelineTab({ jobId }: { jobId: string }) {
  const { data: events = [], isLoading } = useQuery<TimelineEvent[]>({
    queryKey: ['timeline', jobId],
    queryFn: async () => {
      const { data } = await api.get(`/api/jobs/${jobId}/timeline`);
      return data.data;
    },
    enabled: !!jobId,
  });

  if (isLoading) return <LoadingState title="Loading timeline" description="Collecting application events." />;

  return <Timeline events={events} />;
}

function NotesTab({ jobId }: { jobId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Notes management can be added here. The backend already supports timeline events and job notes.
        </p>
      </CardContent>
    </Card>
  );
}

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-xl font-semibold text-card-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm text-card-foreground">{value}</p>
    </div>
  );
}

function AnalysisList({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant: 'default' | 'primary' | 'destructive' | 'info';
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <p className="text-sm font-semibold text-card-foreground">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <Badge key={item} variant={variant === 'default' ? 'default' : variant}>
              {item}
            </Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">No items found.</span>
        )}
      </div>
    </div>
  );
}

function tabLabel(tab: (typeof tabs)[number]) {
  return tab.charAt(0).toUpperCase() + tab.slice(1);
}
