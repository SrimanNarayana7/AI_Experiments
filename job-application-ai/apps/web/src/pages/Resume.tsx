import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Download,
  Eye,
  RotateCcw,
  Trash2,
  Search,
  LibraryBig,
  Plus,
  GitCompareArrows,
} from 'lucide-react';
import type { ResumeLibraryItem, ResumeVersion } from '@repo/shared';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { EmptyState, LoadingState, ErrorState } from '../components/common/States';
import { FileUpload } from '../components/resume/FileUpload';
import { ResumePreviewModal, VersionCompareDialog } from '../components/resume/ResumeViewer';
import {
  useResumeLibrary,
  useUploadResume,
  useDeleteResume,
  useReplaceResume,
  useCreateResume,
} from '../hooks/useResume';
import { api, getApiErrorMessage } from '../services/api';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../context/app-context';

export function Resume() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'highest-score' | 'lowest-score'>('newest');
  const [type, setType] = useState<'all' | 'MASTER' | 'COMPANY'>('all');
  const { data, isLoading } = useResumeLibrary({
    search: search || undefined,
    sort,
    type: type === 'all' ? undefined : type,
  });
  const uploadResume = useUploadResume();
  const createResume = useCreateResume();
  const replaceResume = useReplaceResume();
  const deleteResume = useDeleteResume();
  const { pushToast } = useToast();

  const [pasteText, setPasteText] = useState('');
  const [selectedPreview, setSelectedPreview] = useState<{
    title: string;
    pdfUrl: string;
    fileName: string;
    score?: number | null;
    breakdown?: Record<string, number> | null;
    details: Array<{ label: string; value: string }>;
  } | null>(null);
  const [compareJobId, setCompareJobId] = useState<string | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<ResumeLibraryItem | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const master = data?.masterResume ?? null;
  const companyResumes = data?.companyResumes ?? [];
  const recentDocuments = data?.recentDocuments ?? [];
  const isBusy = uploadResume.isPending || replaceResume.isPending;

  const onUpload = async (file: File | null) => {
    if (!file) return;
    uploadResume.reset();
    const formData = new FormData();
    formData.append('file', file);
    try {
      await uploadResume.mutateAsync(formData);
      pushToast({
        title: 'Resume uploaded',
        description: file.name,
        tone: 'success',
      });
    } catch (error) {
      pushToast({
        title: 'Resume upload failed',
        description: getApiErrorMessage(error),
        tone: 'error',
      });
    }
  };

  const onPasteSave = async () => {
    if (!pasteText.trim()) return;
    await createResume.mutateAsync(
      { content: pasteText.trim(), rawText: pasteText.trim() },
      {
        onSuccess: () => {
          pushToast({
            title: 'Master resume saved',
            description: 'Saved from pasted text.',
            tone: 'success',
          });
          setPasteText('');
        },
      },
    );
  };

  // Filter the company-resume grid by the search term (matches the API's own
  // search semantics) so the "Search company or role" box actually narrows results.
  const filteredCompanyResumes = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return companyResumes;
    return companyResumes.filter((item) =>
      [item.company, item.title, item.filename, item.originalFilename]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(needle)),
    );
  }, [companyResumes, search]);

  if (isLoading) {
    return <LoadingState title="Loading resume library" description="Collecting uploaded documents and generated versions." />;
  }

  if (!data) {
    return <ErrorState title="Resume library unavailable" description="We couldn’t load the resume library." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="primary">Resume Library</Badge>
            <Badge variant="info">Master source of truth</Badge>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-card-foreground">
            Master Resume and company-specific versions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a master resume, generate company versions, preview documents in-app, and manage the full library.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setPasteText('')}>
            <Plus className="mr-2 h-4 w-4" />
            Paste Resume Text
          </Button>
          <Link to="/jobs">
            <Button>
              <LibraryBig className="mr-2 h-4 w-4" />
              View Jobs
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>MASTER RESUME</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!master ? (
            <div className="space-y-4">
              <FileUpload
                label="Upload your existing resume"
                hint="Drag and drop a PDF or DOCX resume, or browse files."
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={onUpload}
                disabled={uploadResume.isPending}
              />
              {uploadResume.isPending && <UploadProgressBanner label="Uploading resume..." />}
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <ResumeDocumentCard
                title={master.name}
                subtitle={master.originalFilename ?? 'Master resume file'}
                meta={[
                  { label: 'File type', value: master.mimeType ?? 'Text' },
                  { label: 'File size', value: master.fileSize ? formatBytes(master.fileSize) : '—' },
                  { label: 'Uploaded', value: new Date(master.createdAt).toLocaleString() },
                  { label: 'Source', value: master.sourceType ?? 'manual' },
                ]}
                actions={
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setSelectedPreview({
                          title: 'Master Resume',
                          pdfUrl: `/api/resumes/${master.id}/preview`,
                          fileName: master.originalFilename ?? `${master.name}.pdf`,
                          details: [
                            { label: 'Filename', value: master.originalFilename ?? master.name },
                            { label: 'Type', value: master.mimeType ?? 'Text' },
                            { label: 'Updated', value: new Date(master.updatedAt).toLocaleString() },
                          ],
                        })
                      }
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View PDF
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => window.location.assign(`/api/resumes/${master.id}/download`)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => {
                        setReplaceTarget({
                          id: master.id,
                          type: 'MASTER',
                          jobId: null,
                          isCurrent: master.isActive,
                          company: null,
                          title: master.name,
                          score: null,
                          atsScore: null,
                          filename: master.originalFilename ?? `${master.name}.pdf`,
                          originalFilename: master.originalFilename,
                          mimeType: master.mimeType ?? undefined,
                          fileSize: master.fileSize ?? undefined,
                          storagePath: master.storagePath ?? undefined,
                          createdAt: master.createdAt,
                          updatedAt: master.updatedAt,
                        });
                        replaceInputRef.current?.click();
                      }}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Replace
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (window.confirm('Delete Master Resume? This will remove the saved master resume from your library.')) {
                          deleteResume.mutate(master.id);
                        }
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                }
              />

              <div className="space-y-4">
                {isBusy && (
                  <UploadProgressBanner
                    label={uploadResume.isPending ? 'Uploading resume...' : 'Replacing master resume...'}
                  />
                )}
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="sr-only"
                  disabled={replaceResume.isPending}
                  onChange={async (event) => {
                    const input = event.currentTarget;
                    const file = input.files?.[0];
                    if (!file || !replaceTarget) return;

                    replaceResume.reset();
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                      await replaceResume.mutateAsync({ id: replaceTarget.id, formData });
                      pushToast({
                        title: 'Master resume replaced',
                        description: file.name,
                        tone: 'success',
                      });
                    } catch (error) {
                      pushToast({
                        title: 'Resume replacement failed',
                        description: getApiErrorMessage(error),
                        tone: 'error',
                      });
                    } finally {
                      input.value = '';
                      setReplaceTarget(null);
                    }
                  }}
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>Paste Resume Text</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  rows={10}
                  value={pasteText}
                  onChange={(event) => setPasteText(event.target.value)}
                  placeholder="Optional fallback if you want to paste resume text instead of uploading a file."
                />
                <div className="flex gap-3">
                  <Button onClick={onPasteSave} isLoading={createResume.isPending}>
                    Save Pasted Resume
                  </Button>
                  <Button variant="secondary" onClick={() => setPasteText('')}>
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-card-foreground">Company Resumes</h2>
            <p className="text-sm text-muted-foreground">Generated versions for each job and company.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" placeholder="Search company or role" />
            </div>
            <Select value={type} onChange={(event) => setType(event.target.value as typeof type)}>
              <option value="all">All types</option>
              <option value="MASTER">Master</option>
              <option value="COMPANY">Company</option>
            </Select>
            <Select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="highest-score">Highest Score</option>
              <option value="lowest-score">Lowest Score</option>
            </Select>
          </div>
        </div>

        {filteredCompanyResumes.length === 0 ? (
          <EmptyState
            title="No company resumes yet"
            description="Generate a resume for a job to add company-specific versions here."
            action={
              <Link to="/jobs">
                <Button variant="secondary">View Jobs</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredCompanyResumes.map((item) => (
              <CompanyResumeCard
                key={item.id}
                item={item}
                onView={async () => {
                  const { data } = await api.get(`/api/resume-versions/${item.id}`);
                  const version = data.data as ResumeVersion;
                  setSelectedPreview({
                    title: `${item.company ?? 'Company'} — ${item.title ?? 'Resume'}`,
                    pdfUrl: `/api/resume-versions/${item.id}/preview`,
                    fileName: item.filename ?? `Resume v${item.versionNumber}`,
                    score: version.score,
                    breakdown: (version.scoreBreakdown as Record<string, number>) ?? null,
                    details: [
                      { label: 'Company', value: item.company ?? '—' },
                      { label: 'Role', value: item.title ?? '—' },
                      { label: 'Version', value: `v${item.versionNumber ?? 1}` },
                      { label: 'Created', value: new Date(version.createdAt).toLocaleString() },
                    ],
                  });
                }}
                onCompare={() => setCompareJobId(item.jobId ?? null)}
                onDelete={() =>
                  deleteResume.mutate(item.id, {
                    onSuccess: () => {
                      pushToast({
                        title: 'Resume deleted',
                        description: item.filename ?? 'Company resume',
                        tone: 'success',
                      });
                    },
                  })
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-card-foreground">Recent Documents</h2>
          <p className="text-sm text-muted-foreground">Recent uploads and generated documents from the library.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {recentDocuments.map((doc) => (
            <DocumentChip
              key={doc.id}
              doc={doc}
              onView={() => {
                if (doc.type === 'MASTER') {
                  setSelectedPreview({
                    title: 'Master Resume',
                    pdfUrl: `/api/resumes/${doc.id}/preview`,
                    fileName: doc.filename ?? 'master_resume.pdf',
                    details: [
                      { label: 'Type', value: 'Master resume' },
                      { label: 'Updated', value: new Date(doc.updatedAt).toLocaleString() },
                    ],
                  });
                } else {
                  setSelectedPreview({
                    title: `${doc.company ?? 'Company'} — ${doc.title ?? 'Resume'}`,
                    pdfUrl: `/api/resume-versions/${doc.id}/preview`,
                    fileName: doc.filename ?? 'resume.pdf',
                    details: [
                      { label: 'Company', value: doc.company ?? '—' },
                      { label: 'Role', value: doc.title ?? '—' },
                      { label: 'Version', value: doc.versionNumber ? `v${doc.versionNumber}` : '—' },
                    ],
                  });
                }
              }}
            />
          ))}
        </div>
      </section>

      {selectedPreview && (
        <ResumePreviewModal
          open={!!selectedPreview}
          onClose={() => setSelectedPreview(null)}
          title={selectedPreview.title}
          pdfUrl={selectedPreview.pdfUrl}
          fileName={selectedPreview.fileName}
          score={selectedPreview.score}
          breakdown={selectedPreview.breakdown}
          details={selectedPreview.details}
        />
      )}

      {compareJobId && <VersionCompareWrapper jobId={compareJobId} onClose={() => setCompareJobId(null)} />}
    </div>
  );
}

function VersionCompareWrapper({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const { data: versions = [] } = useQuery<ResumeVersion[]>({
    queryKey: ['resume-versions', jobId, 'compare'],
    queryFn: async () => {
      const { data } = await api.get(`/api/jobs/${jobId}/resume-versions`);
      return data.data ?? [];
    },
    enabled: !!jobId,
  });

  return <VersionCompareDialog open={!!jobId} onClose={onClose} versions={versions} />;
}

function ResumeDocumentCard({
  title,
  subtitle,
  meta,
  actions,
}: {
  title: string;
  subtitle: string;
  meta: Array<{ label: string; value: string }>;
  actions: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <p className="text-base font-semibold text-card-foreground">{title}</p>
          </div>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {meta.map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-muted/30 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
            <p className="text-sm font-medium text-card-foreground">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompanyResumeCard({
  item,
  onView,
  onCompare,
  onDelete,
}: {
  item: ResumeLibraryItem;
  onView: () => void;
  onCompare: () => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">{item.company ?? 'Company'}</Badge>
              {item.isCurrent && <Badge variant="success">Current</Badge>}
            </div>
            <p className="mt-2 font-semibold text-card-foreground">{item.title ?? 'Resume'}</p>
            <p className="text-sm text-muted-foreground">
              Version {item.versionNumber ?? 1} • Score {item.score ?? '—'}
            </p>
          </div>
          <Badge variant={item.score && item.score >= 85 ? 'success' : 'default'}>
            {item.score ?? 'PDF'}
          </Badge>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm" onClick={onView}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.location.assign(`/api/resume-versions/${item.id}/download`)}
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button variant="secondary" size="sm" onClick={onCompare}>
            <GitCompareArrows className="mr-2 h-4 w-4" />
            Compare
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentChip({
  doc,
  onView,
}: {
  doc: ResumeLibraryItem;
  onView: () => void;
}) {
  return (
    <Card>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Badge variant={doc.type === 'MASTER' ? 'primary' : 'success'}>{doc.type}</Badge>
            <p className="text-xs text-muted-foreground">{new Date(doc.updatedAt).toLocaleDateString()}</p>
          </div>
          <p className="font-medium text-card-foreground">{doc.company ?? doc.title ?? doc.filename}</p>
          <p className="text-sm text-muted-foreground">{doc.filename}</p>
          <Button variant="secondary" size="sm" onClick={onView} className="mt-2">
            <Eye className="mr-2 h-4 w-4" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UploadProgressBanner({ label }: { label: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-card-foreground">{label}</p>
          <span className="text-xs font-medium text-muted-foreground">Working</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-3/4 animate-pulse rounded-full bg-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Extracting text and preparing the document.</p>
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}
