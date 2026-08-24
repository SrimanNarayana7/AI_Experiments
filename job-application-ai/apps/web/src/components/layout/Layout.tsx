import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Command,
  FileText,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Sparkles,
  Moon,
  SunMedium,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useTheme, useToast } from '../../context/app-context';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useQuery } from '@tanstack/react-query';
import { api, type ApiResponse } from '../../services/api';
import type { Job, ResumeLibraryItem } from '@repo/shared';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/jobs', label: 'Jobs', icon: Briefcase },
  { path: '/resume', label: 'Resume Library', icon: FileText },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { toasts } = useToast();
  const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem('jai-sidebar') === 'collapsed');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem('jai-sidebar', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
        setWorkspaceOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
        setWorkspaceOpen(false);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r border-border bg-[rgb(var(--sidebar))] text-[rgb(var(--sidebar-foreground))] transition-transform duration-200 lg:sticky lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-72 lg:w-20' : 'w-72'}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div>
                <p className="text-sm font-semibold tracking-tight">Job AI Copilot</p>
                <p className="text-xs text-muted-foreground">Enterprise resume ops</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg border border-border bg-card p-2 text-muted-foreground transition hover:text-card-foreground lg:hidden"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="hidden rounded-lg border border-border bg-card p-2 text-muted-foreground transition hover:text-card-foreground lg:inline-flex"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-ring ${
                  active
                    ? 'bg-primary/12 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-card-foreground'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground transition hover:text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground shadow-sm transition hover:border-primary/40 hover:text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring lg:max-w-2xl"
            >
              <Search className="h-4 w-4" />
              <span className="min-w-0 truncate">Search jobs, companies, versions, and documents</span>
              <span className="ml-auto hidden items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline-flex">
                <Command className="h-3 w-3" />
                K
              </span>
            </button>

            <div ref={actionsRef} className="relative ml-auto flex shrink-0 items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTheme(nextTheme(theme))}
                aria-label="Toggle theme"
              >
                {resolvedTheme === 'dark' ? (
                  <SunMedium className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">
                  {theme === 'SYSTEM' ? 'System' : theme === 'DARK' ? 'Dark' : 'Light'}
                </span>
              </Button>

              <button
                type="button"
                onClick={() => {
                  setWorkspaceOpen(false);
                  setNotificationsOpen((value) => !value);
                }}
                className="relative rounded-xl border border-border bg-card p-2.5 text-muted-foreground transition hover:text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <Bell className="h-4 w-4" />
                {toasts.length > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {toasts.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen(false);
                  setWorkspaceOpen((value) => !value);
                }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2 text-left transition hover:border-primary/40 hover:bg-card/95 focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Open workspace menu"
                aria-expanded={workspaceOpen}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="text-xs font-semibold">SA</span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-card-foreground">Sriman Workspace</p>
                  <p className="text-xs text-muted-foreground">Personal workspace</p>
                </div>
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-full z-30 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_28px_72px_rgba(15,23,42,0.24)]">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-card-foreground">Notifications</p>
                      <p className="text-xs text-muted-foreground">Recent activity and app updates</p>
                    </div>
                    <Badge variant="secondary">{toasts.length} live</Badge>
                  </div>
                  <div className="max-h-80 overflow-auto p-2">
                    {toasts.length > 0 ? (
                      toasts
                        .slice()
                        .reverse()
                        .map((toast) => (
                          <div key={toast.id} className="rounded-xl px-3 py-3 transition hover:bg-muted">
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-0.5 rounded-full p-1.5 ${
                                  toast.tone === 'error'
                                    ? 'bg-destructive/15 text-destructive'
                                    : toast.tone === 'info'
                                      ? 'bg-info/15 text-info'
                                      : 'bg-success/15 text-success'
                                }`}
                              >
                                <Bell className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-card-foreground">{toast.title}</p>
                                {toast.description && (
                                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{toast.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
                        <p className="text-sm font-medium text-card-foreground">You’re all caught up</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          New resume, job, and sync updates will appear here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {workspaceOpen && (
                <div className="absolute right-0 top-full z-30 mt-3 w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_28px_72px_rgba(15,23,42,0.24)]">
                  <div className="border-b border-border px-4 py-4">
                    <p className="text-sm font-semibold text-card-foreground">Sriman Workspace</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Local workspace connected to the Job AI Copilot app.
                    </p>
                  </div>
                  <div className="p-2">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-card-foreground transition hover:bg-muted"
                      onClick={() => {
                        setWorkspaceOpen(false);
                        setNotificationsOpen(false);
                        navigate('/resume');
                      }}
                    >
                      <span>Open resume library</span>
                      <span className="text-xs text-muted-foreground">Resume</span>
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-card-foreground transition hover:bg-muted"
                      onClick={() => {
                        setWorkspaceOpen(false);
                        setNotificationsOpen(false);
                        navigate('/settings');
                      }}
                    >
                      <span>Workspace settings</span>
                      <span className="text-xs text-muted-foreground">Settings</span>
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-card-foreground transition hover:bg-muted"
                      onClick={() => {
                        setWorkspaceOpen(false);
                        setNotificationsOpen(false);
                        setTheme(nextTheme(theme));
                      }}
                    >
                      <span>Toggle theme</span>
                      <span className="text-xs text-muted-foreground">
                        {theme === 'SYSTEM' ? 'System' : theme === 'DARK' ? 'Dark' : 'Light'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px]">{children}</div>
        </div>
      </main>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}

function nextTheme(current: 'LIGHT' | 'DARK' | 'SYSTEM') {
  if (current === 'SYSTEM') return 'LIGHT' as const;
  if (current === 'LIGHT') return 'DARK' as const;
  return 'SYSTEM' as const;
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const jobs = useQuery<Job[]>({
    queryKey: ['command-palette-jobs'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Job[]>>('/api/jobs');
      return data.data ?? [];
    },
    enabled: open,
  });
  const library = useQuery<{ masterResumes: ResumeLibraryItem[]; companyResumes: ResumeLibraryItem[] }>(
    {
      queryKey: ['command-palette-library'],
      queryFn: async () => {
        const { data } = await api.get<ApiResponse<{
          masterResumes: ResumeLibraryItem[];
          companyResumes: ResumeLibraryItem[];
        }>>('/api/resumes/library');
        return data.data ?? { masterResumes: [], companyResumes: [] };
      },
      enabled: open,
    },
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [] as Array<{ label: string; href: string; meta: string }>;

    const jobResults = (jobs.data ?? [])
      .filter((job) =>
        [job.company, job.title, job.description, job.status].some((value) =>
          value.toLowerCase().includes(needle),
        ),
      )
      .slice(0, 6)
      .map((job) => ({ label: `${job.company} — ${job.title}`, href: `/jobs/${job.id}`, meta: `Job ${job.status}` }));

    const resumeResults = [...(library.data?.masterResumes ?? []), ...(library.data?.companyResumes ?? [])]
      .filter((item) =>
        [item.company, item.title, item.filename, item.originalFilename]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(needle)),
      )
      .slice(0, 6)
      .map((item) => ({
        label:
          item.type === 'MASTER'
            ? item.title ?? 'Master Resume'
            : `${item.company ?? 'Company'} — ${item.title ?? 'Resume'}`,
        href: item.type === 'MASTER' ? '/resume' : '/resume',
        meta: item.type === 'MASTER' ? 'Master resume' : `Resume v${item.versionNumber ?? 1}`,
      }));

    return [...jobResults, ...resumeResults];
  }, [query, jobs.data, library.data]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <Dialog open={open} title="Search" description="Find jobs, companies, and resume documents." onClose={onClose}>
      <div className="space-y-4">
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Amazon, v3, Playwright, Applied..."
        />

        <div className="max-h-[55vh] space-y-2 overflow-auto pr-1">
          {query.trim().length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Search across companies, job titles, resume versions, and saved documents.
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No results found.
            </div>
          ) : (
            results.map((result) => (
              <Link
                key={`${result.href}-${result.label}`}
                to={result.href}
                onClick={onClose}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 transition hover:border-primary/40 hover:bg-muted"
              >
                <div>
                  <p className="font-medium text-card-foreground">{result.label}</p>
                  <p className="text-xs text-muted-foreground">{result.meta}</p>
                </div>
                <Badge variant="primary">Open</Badge>
              </Link>
            ))
          )}
        </div>
      </div>
    </Dialog>
  );
}
