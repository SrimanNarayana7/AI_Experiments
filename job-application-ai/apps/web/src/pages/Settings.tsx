import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { useTheme } from '../context/app-context';

const settingsKey = 'jai-settings';

type LocalSettings = {
  targetScore: number;
  aiModel: string;
  maxOptimizationIterations: number;
  defaultPriority: string;
  defaultJobStatus: string;
  storageProvider: string;
  pdfFont: string;
  pdfMargins: string;
  pdfLayout: string;
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
};

const defaultSettings: LocalSettings = {
  targetScore: 85,
  aiModel: 'deepseek-v4-flash',
  maxOptimizationIterations: 3,
  defaultPriority: 'MEDIUM',
  defaultJobStatus: 'BACKLOG',
  storageProvider: 'LOCAL',
  pdfFont: 'Helvetica',
  pdfMargins: 'Normal',
  pdfLayout: 'Single column',
  theme: 'SYSTEM',
};

export function Settings() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<LocalSettings>(() => {
    const stored = localStorage.getItem(settingsKey);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, [settings]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Badge variant="primary">Settings</Badge>
          <Badge variant="info">Product preferences</Badge>
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-card-foreground">Application settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tune appearance, AI defaults, resume preferences, PDF output, storage, and application behavior.
        </p>
      </div>

      <SettingsSection title="Appearance" description="Theme selection and visual behavior.">
        <div className="grid gap-4 md:grid-cols-3">
          {(['LIGHT', 'DARK', 'SYSTEM'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setTheme(option);
                setSettings({ ...settings, theme: option });
              }}
              className={`rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-ring ${
                theme === option
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-card-foreground hover:border-primary/30'
              }`}
            >
              <p className="font-semibold">{option}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {option === 'SYSTEM'
                  ? 'Follow the operating system preference.'
                  : option === 'LIGHT'
                    ? 'Use the light theme.'
                    : 'Use the dark theme.'}
              </p>
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="AI" description="Model and optimization defaults.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="AI Model">
            <Input
              value={settings.aiModel}
              onChange={(event) => setSettings({ ...settings, aiModel: event.target.value })}
            />
          </Field>
          <Field label="Target Score">
            <Input
              type="number"
              min={0}
              max={100}
              value={settings.targetScore}
              onChange={(event) => setSettings({ ...settings, targetScore: Number(event.target.value) })}
            />
          </Field>
          <Field label="Maximum Optimization Iterations">
            <Input
              type="number"
              min={1}
              max={5}
              value={settings.maxOptimizationIterations}
              onChange={(event) =>
                setSettings({ ...settings, maxOptimizationIterations: Number(event.target.value) })
              }
            />
          </Field>
          <Field label="AI runtime note">
            <div className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              DeepSeek credentials remain backend-only and are never exposed in the UI.
            </div>
          </Field>
        </div>
      </SettingsSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsSection title="Resume" description="Default master resume behavior.">
          <Field label="Default Master Resume">
            <Select
              value="Active Master Resume"
              onChange={() => undefined}
            >
              <option>Active Master Resume</option>
            </Select>
          </Field>
          <Field label="Default Priority">
            <Select
              value={settings.defaultPriority}
              onChange={(event) => setSettings({ ...settings, defaultPriority: event.target.value })}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </Select>
          </Field>
          <Field label="Default Job Status">
            <Select
              value={settings.defaultJobStatus}
              onChange={(event) => setSettings({ ...settings, defaultJobStatus: event.target.value })}
            >
              <option value="BACKLOG">Backlog</option>
              <option value="SAVED">Saved</option>
              <option value="APPLIED">Applied</option>
            </Select>
          </Field>
        </SettingsSection>

        <SettingsSection title="PDF" description="Deterministic ATS-friendly document output.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Font">
              <Input value={settings.pdfFont} onChange={(event) => setSettings({ ...settings, pdfFont: event.target.value })} />
            </Field>
            <Field label="Margins">
              <Select
                value={settings.pdfMargins}
                onChange={(event) => setSettings({ ...settings, pdfMargins: event.target.value })}
              >
                <option value="Narrow">Narrow</option>
                <option value="Normal">Normal</option>
                <option value="Wide">Wide</option>
              </Select>
            </Field>
            <Field label="Layout">
              <Select
                value={settings.pdfLayout}
                onChange={(event) => setSettings({ ...settings, pdfLayout: event.target.value })}
              >
                <option value="Single column">Single column</option>
                <option value="ATS optimized">ATS optimized</option>
              </Select>
            </Field>
          </div>
        </SettingsSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsSection title="Storage" description="Keep storage provider abstracted.">
          <Field label="Storage Provider">
            <Select
              value={settings.storageProvider}
              onChange={(event) => setSettings({ ...settings, storageProvider: event.target.value })}
            >
              <option value="LOCAL">Local Filesystem</option>
              <option value="S3">S3-Compatible</option>
            </Select>
          </Field>
        </SettingsSection>

        <SettingsSection title="Application" description="Default workflow preferences.">
          <Field label="Theme (saved)">
            <Input value={settings.theme} readOnly />
          </Field>
          <Field label="Notes">
            <div className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
              Application-wide settings are stored locally for the current workspace until a backend settings API is connected.
            </div>
          </Field>
        </SettingsSection>
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-card-foreground">{label}</label>
      {children}
    </div>
  );
}
