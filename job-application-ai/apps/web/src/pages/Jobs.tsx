import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState, LoadingState } from '../components/common/States';
import { useJobs, useUpdateJobStatus, useCreateJob, useDeleteJob } from '../hooks/useJobs';
import type { Job, JobStatus } from '@repo/shared';
import { useToast } from '../context/app-context';
import { useQueryClient } from '@tanstack/react-query';

const columns: JobStatus[] = [
  'BACKLOG',
  'SAVED',
  'APPLIED',
  'RECRUITER_SCREEN',
  'TECHNICAL_INTERVIEW',
  'FINAL_INTERVIEW',
  'OFFER',
  'REJECTED',
];

const columnLabels: Record<JobStatus, string> = {
  BACKLOG: 'Backlog',
  SAVED: 'Saved',
  APPLIED: 'Applied',
  RECRUITER_SCREEN: 'Recruiter Screen',
  TECHNICAL_INTERVIEW: 'Technical Interview',
  FINAL_INTERVIEW: 'Final Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
};

export function Jobs() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const { data: jobs = [], isLoading } = useJobs({
    search: search || undefined,
    status: status || undefined,
    priority: priority || undefined,
  });
  const updateStatus = useUpdateJobStatus();
  const createJob = useCreateJob();
  const deleteJob = useDeleteJob();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState<Job | null>(null);
  const [form, setForm] = useState({
    company: '',
    title: '',
    url: '',
    location: '',
    salary: '',
    priority: 'MEDIUM',
    description: '',
  });

  const filteredJobs = useMemo(() => jobs, [jobs]);

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    createJob.mutate(
      {
        ...form,
        status: 'BACKLOG',
        priority: form.priority as Job['priority'],
      },
      {
        onSuccess: () => {
          pushToast({
            title: 'Job created',
            description: `${form.company} — ${form.title}`,
            tone: 'success',
          });
          setShowForm(false);
          setForm({
            company: '',
            title: '',
            url: '',
            location: '',
            salary: '',
            priority: 'MEDIUM',
            description: '',
          });
        },
      },
    );
  };

  const handleDrop = (jobId: string, nextStatus: JobStatus) => {
    updateStatus.mutate(
      { id: jobId, status: nextStatus },
      {
        onSuccess: () => {
          pushToast({
            title: 'Job moved',
            description: `Moved to ${columnLabels[nextStatus]}`,
            tone: 'info',
          });
        },
      },
    );
  };

  const handleDelete = (job: Job) => {
    deleteJob.mutate(job.id, {
      onSuccess: () => {
        pushToast({ title: 'Job deleted', description: job.company, tone: 'success' });
        setConfirmDelete(null);
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
      },
    });
  };

  if (isLoading) return <LoadingState title="Loading jobs" description="Fetching your kanban board." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-card-foreground">Job Tracker</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compact kanban board with filters, quick actions, and optimistic status updates.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Job
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search company, title, or JD..."
            className="pl-10"
          />
        </div>
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {columns.map((column) => (
            <option key={column} value={column}>
              {columnLabels[column]}
            </option>
          ))}
        </Select>
        <Select value={priority} onChange={(event) => setPriority(event.target.value)}>
          <option value="">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </Select>
      </div>

      {showForm && (
        <Card>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  required
                  placeholder="Company"
                  value={form.company}
                  onChange={(event) => setForm({ ...form, company: event.target.value })}
                />
                <Input
                  required
                  placeholder="Job title"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                />
                <Input
                  placeholder="Job URL"
                  value={form.url}
                  onChange={(event) => setForm({ ...form, url: event.target.value })}
                />
                <Input
                  placeholder="Location"
                  value={form.location}
                  onChange={(event) => setForm({ ...form, location: event.target.value })}
                />
                <Input
                  placeholder="Salary"
                  value={form.salary}
                  onChange={(event) => setForm({ ...form, salary: event.target.value })}
                />
                <Select
                  value={form.priority}
                  onChange={(event) => setForm({ ...form, priority: event.target.value })}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </Select>
              </div>
              <Textarea
                required
                placeholder="Paste the job description..."
                rows={6}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
              <div className="flex gap-3">
                <Button type="submit" isLoading={createJob.isPending}>
                  Save Job
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!filteredJobs.length ? (
        <EmptyState
          title="No jobs yet"
          description="Start by adding a job to build your application pipeline."
          action={<Button onClick={() => setShowForm(true)}>Add Your First Job</Button>}
        />
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-4">
            {columns.map((column) => (
              <KanbanColumn
                key={column}
                status={column}
                label={columnLabels[column]}
                jobs={filteredJobs.filter((job) => job.status === column)}
                onDrop={handleDrop}
                onDelete={(job) => setConfirmDelete(job)}
              />
            ))}
          </div>
        </div>
      )}

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Job?"
        description="This will remove the job, timeline, and related resume versions from the tracker."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              isLoading={deleteJob.isPending}
            >
              Delete Job
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          You can always recreate the application later, but the timeline and stored versions will be removed.
        </p>
      </Dialog>
    </div>
  );
}

function KanbanColumn({
  status,
  label,
  jobs,
  onDrop,
  onDelete,
}: {
  status: JobStatus;
  label: string;
  jobs: Job[];
  onDrop: (jobId: string, status: JobStatus) => void;
  onDelete: (job: Job) => void;
}) {
  const [isOver, setIsOver] = useState(false);

  return (
    <section
      className={`w-[320px] shrink-0 rounded-2xl border border-border p-3 ${
        isOver ? 'bg-primary/5' : 'bg-muted/20'
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsOver(false);
        const jobId = event.dataTransfer.getData('jobId');
        if (jobId) onDrop(jobId, status);
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-card-foreground">{label}</h3>
          <p className="text-xs text-muted-foreground">{jobs.length} jobs</p>
        </div>
        <Badge>{status.replace(/_/g, ' ')}</Badge>
      </div>
      <div className="space-y-3">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} onDelete={() => onDelete(job)} />
        ))}
      </div>
    </section>
  );
}

function JobCard({ job, onDelete }: { job: Job; onDelete: () => void }) {
  return (
    <Card
      className="cursor-move transition hover:-translate-y-0.5 hover:shadow-md"
      onDragStart={(event: React.DragEvent<HTMLDivElement>) => event.dataTransfer.setData('jobId', job.id)}
      draggable
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-card-foreground">{job.company}</p>
              <p className="truncate text-sm text-muted-foreground">{job.title}</p>
            </div>
            <Badge variant={job.priority === 'URGENT' || job.priority === 'HIGH' ? 'destructive' : 'default'}>
              {job.priority}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MiniMetric label="Match" value={job.score ?? '—'} />
            <MiniMetric label="ATS" value={job.atsScore ?? '—'} />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top skills</p>
            <div className="flex flex-wrap gap-2">
              {job.topSkills?.length ? (
                job.topSkills.map((skill) => (
                  <Badge key={skill} variant="primary">
                    {skill}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">Analyze JD to populate matched skills</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <p className="font-medium text-card-foreground">Location</p>
              <p>{job.location ?? 'Not specified'}</p>
            </div>
            <div>
              <p className="font-medium text-card-foreground">Applied</p>
              <p>{job.appliedAt ? new Date(job.appliedAt).toLocaleDateString() : 'Not applied'}</p>
            </div>
            <div>
              <p className="font-medium text-card-foreground">Resume</p>
              <p>{job.latestResumeVersion ? `v${job.latestResumeVersion}` : '—'}</p>
            </div>
            <div>
              <p className="font-medium text-card-foreground">Status</p>
              <p>{job.status.replace(/_/g, ' ')}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Link to={`/jobs/${job.id}`} className="flex-1">
              <Button variant="secondary" size="sm" className="w-full">
                Open
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-card-foreground">{value}</p>
    </div>
  );
}
