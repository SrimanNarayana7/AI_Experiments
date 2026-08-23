import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

type ThemeMode = 'LIGHT' | 'DARK' | 'SYSTEM';
type ResolvedTheme = 'light' | 'dark';

type ToastTone = 'success' | 'error' | 'info';

type Toast = {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
};

const ThemeContext = createContext<{
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
} | null>(null);

const ToastContext = createContext<{
  toasts: Toast[];
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
} | null>(null);

export function AppProviders({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('jai-theme');
    return stored === 'LIGHT' || stored === 'DARK' || stored === 'SYSTEM' ? stored : 'SYSTEM';
  });
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(theme),
  );
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const next = resolveTheme(theme);
      setResolvedTheme(next);
      document.documentElement.dataset.theme = next;
      document.documentElement.style.colorScheme = next;
    };

    apply();
    localStorage.setItem('jai-theme', theme);

    const handler = () => {
      if (theme === 'SYSTEM') apply();
    };

    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [theme]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = window.setTimeout(() => {
      setToasts((items) => items.slice(1));
    }, 3800);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  const themeValue = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (next: ThemeMode) => setThemeState(next),
    }),
    [theme, resolvedTheme],
  );

  const toastValue = useMemo(
    () => ({
      toasts,
      pushToast: (toast: Omit<Toast, 'id'>) =>
        setToasts((items) => [
          ...items.slice(-2),
          {
            id: crypto.randomUUID(),
            ...toast,
          },
        ]),
      dismissToast: (id: string) => setToasts((items) => items.filter((item) => item.id !== id)),
    }),
    [toasts],
  );

  return (
    <ThemeContext.Provider value={themeValue}>
      <ToastContext.Provider value={toastValue}>
        {children}
        <ToastViewport />
      </ToastContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within AppProviders');
  return value;
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used within AppProviders');
  return value;
}

function resolveTheme(theme: ThemeMode): ResolvedTheme {
  if (theme === 'LIGHT') return 'light';
  if (theme === 'DARK') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="rounded-xl border border-border bg-card p-4 shadow-[0_24px_64px_rgba(15,23,42,0.16)]"
        >
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
              {toast.tone === 'error' ? (
                <XCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-card-foreground">{toast.title}</p>
              {toast.description && (
                <p className="mt-1 text-sm text-muted-foreground">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="rounded-md px-1.5 py-1 text-muted-foreground transition hover:bg-muted hover:text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
