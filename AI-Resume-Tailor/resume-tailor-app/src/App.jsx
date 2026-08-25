import React, { useState } from 'react';
import { analyze, generate, renderDoc, extractFile } from './api';
import ResumePreview from './preview';
import {
  Settings,
  Upload,
  Download,
  FileText,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Sparkles,
  FileCode2,
  FileSpreadsheet,
} from 'lucide-react';

const DEFAULT_CONFIG = { baseUrl: 'https://api.deepseek.com/v1', apiKey: '', model: 'deepseek-v4-pro' };

const VERDICT_ICON = {
  '✅ Match': '✅',
  '🟡 Partial': '🟡',
  '🙈 Absent': '🙈',
  Match: '✅',
  Partial: '🟡',
  Absent: '🙈',
};

const STEPS = ['Input', 'Match table', 'Resume'];

function loadConfig() {
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem('rt-config') || '{}') };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(cfg) {
  localStorage.setItem('rt-config', JSON.stringify(cfg));
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function verdictOf(row) {
  const key = Object.keys(row).find((k) => k.toLowerCase().includes('verdict')) || '';
  return row[key] || Object.values(row)[0];
}

const VERDICT_STYLE = {
  Match: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: '✓', dot: 'bg-emerald-500' },
  Partial: { badge: 'bg-amber-50 text-amber-700 ring-amber-200', icon: '~', dot: 'bg-amber-500' },
  Absent: { badge: 'bg-red-50 text-red-700 ring-red-200', icon: '×', dot: 'bg-red-500' },
};

function verdictMeta(verdict) {
  if (verdict?.includes('Match')) return VERDICT_STYLE.Match;
  if (verdict?.includes('Partial')) return VERDICT_STYLE.Partial;
  if (verdict?.includes('Absent')) return VERDICT_STYLE.Absent;
  return { badge: 'bg-slate-50 text-steel ring-slate-200', icon: '', dot: 'bg-slate-400' };
}

function normalizeRow(row) {
  const entries = Object.entries(row || {});
  const verdict = verdictOf(row);
  const reqKey = entries.find(([k]) => /requirement|skill|item|name/i.test(k));
  const evKey = entries.find(([k]) => /evidence|note|detail|context/i.test(k));
  const requirement = reqKey ? row[reqKey[0]] : entries.find(([k]) => k.toLowerCase() !== 'verdict')?.[1] ?? '';
  const evidence = evKey ? row[evKey[0]] : '';
  return { requirement, evidence, verdict };
}

function parseCsv(text) {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!rows.length) return [];
  const headers = rows[0].split(',').map((h) => h.trim().toLowerCase());
  const company = headers.indexOf('company');
  const title = headers.indexOf('job title') !== -1 ? headers.indexOf('job title') : headers.indexOf('title');
  const desc = headers.indexOf('job description') !== -1 ? headers.indexOf('job description') : headers.indexOf('description');
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i].split(',').map((c) => c.trim());
    out.push({ company: cols[company] || '', title: cols[title] || '', description: cols[desc] || '' });
  }
  return out;
}

export default function App() {
  const [step, setStep] = useState(1);
  const [resume, setResume] = useState('');
  const [resumeName, setResumeName] = useState('');
  const [jd, setJd] = useState('');
  const [config, setConfig] = useState(loadConfig);
  const [showSettings, setShowSettings] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [spec, setSpec] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [cleanWarning, setCleanWarning] = useState('');
  const [csvJobs, setCsvJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  const handleResumeFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExtracting(true);
    setError('');
    try {
      const { text } = await extractFile(file);
      setResume(text);
      setResumeName(file.name);
    } catch (err) {
      setError(`Could not read ${file.name}: ${err.message}`);
    } finally {
      setExtracting(false);
      e.target.value = '';
    }
  };

  const handleJdFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const jobs = parseCsv(text);
      setCsvJobs(jobs);
      if (jobs.length) {
        setSelectedJob(jobs[0]);
        setJd(`Company: ${jobs[0].company}\nJob Title: ${jobs[0].title}\n\n${jobs[0].description}`);
      } else {
        setJd(text);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const runAnalyze = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await analyze(resume, jd, config);
      setAnalysis(result.analysis || result);
      setStep(2);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await generate(resume, jd, analysis, config);
      setSpec(result.spec || result);
      setStep(3);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadDoc = async (clean, format) => {
    setLoading(true);
    setError('');
    setCleanWarning('');
    try {
      const { blob, filename } = await renderDoc(spec, clean, format);
      download(blob, filename);
    } catch (err) {
      if (clean && err.placeholders && err.placeholders.length) {
        setCleanWarning(err.placeholders.join('\n'));
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    download(blob, 'resume-spec.json');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-sky-500 text-white shadow-lg">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-ink">Resume Tailor</h1>
              <p className="text-xs text-muted">Tailor your resume to any job description</p>
            </div>
          </div>
          <button className="button-secondary" onClick={() => setShowSettings((s) => !s)}>
            <Settings className="h-4 w-4" /> Settings
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {showSettings && (
          <div className="card mb-8 space-y-4 border-accent/20 shadow-md">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-accent" />
              <h2 className="font-semibold text-ink">LLM Settings</h2>
            </div>
            <p className="text-xs text-muted">
              Point at any OpenAI-compatible <code className="rounded bg-slate-100 px-1">chat/completions</code> endpoint.
              Configured for DeepSeek by default.
            </p>
            <div>
              <label className="label">Base URL</label>
              <input
                className="input"
                value={config.baseUrl}
                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                placeholder="https://api.deepseek.com/v1"
              />
            </div>
            <div>
              <label className="label">API Key</label>
              <input
                className="input"
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="sk-..."
              />
            </div>
            <div>
              <label className="label">Model</label>
              <input
                className="input"
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                placeholder="deepseek-v4-pro"
              />
            </div>
            <div className="flex justify-end">
              <button
                className="button"
                onClick={() => {
                  saveConfig(config);
                  setShowSettings(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        )}

        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((label, i) => {
            const active = step === i + 1;
            const done = step > i + 1;
            return (
              <React.Fragment key={label}>
                <div
                  className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    active
                      ? 'bg-accent text-white shadow-md'
                      : done
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-white text-steel shadow-sm'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      active ? 'bg-white/25' : done ? 'bg-emerald-500 text-white' : 'bg-slate-200'
                    }`}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  {label}
                </div>
                {i < 2 && <ArrowRight className="h-4 w-4 text-rule" />}
              </React.Fragment>
            );
          })}
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-6">
            <div className="card">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-ink">Master resume</h2>
                  <p className="text-xs text-muted">Upload .pdf / .docx, or paste text</p>
                </div>
                <label className="button-secondary cursor-pointer">
                  {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {resumeName ? resumeName : 'Upload .pdf / .docx'}
                  <input type="file" accept=".pdf,.docx,.doc,.txt,.md" className="hidden" onChange={handleResumeFile} />
                </label>
              </div>
              <textarea
                className="input min-h-[220px] font-mono text-[13px] leading-relaxed"
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="Paste your master resume, or upload a PDF/DOCX to extract text automatically..."
              />
            </div>

            <div className="card">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-ink">Job description</h2>
                  <p className="text-xs text-muted">Paste the posting, or load a CSV of jobs</p>
                </div>
                <label className="button-secondary cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4" /> Upload CSV
                  <input type="file" accept=".csv" className="hidden" onChange={handleJdFile} />
                </label>
              </div>
              {csvJobs.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {csvJobs.map((job, i) => (
                    <button
                      key={i}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        selectedJob === job ? 'bg-accent text-white shadow-sm' : 'bg-slate-100 text-steel hover:bg-slate-200'
                      }`}
                      onClick={() => {
                        setSelectedJob(job);
                        setJd(`Company: ${job.company}\nJob Title: ${job.title}\n\n${job.description}`);
                      }}
                    >
                      {job.company} — {job.title}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                className="input min-h-[220px] font-mono text-[13px] leading-relaxed"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the job description here..."
              />
            </div>

            <button
              className="button h-12 w-full text-base"
              onClick={runAnalyze}
              disabled={loading || !resume || !jd}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
              Analyze match
            </button>
          </div>
        )}

        {step === 2 && analysis && (
          <div className="space-y-6">
            <div className="card overflow-hidden !p-0">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-ink">Match table</h2>
                  <p className="text-xs text-muted">How each requirement maps to your resume</p>
                </div>
                <span className="rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
                  {analysis.fit || ''}
                </span>
              </div>

              <div className="overflow-x-auto px-6">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-muted">
                      <th className="py-2 pr-4 font-semibold">Requirement</th>
                      <th className="w-32 py-2 pr-4 font-semibold">Verdict</th>
                      <th className="py-2 font-semibold">Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analysis.matchTable || []).map((row, i) => {
                      const { requirement, evidence, verdict } = normalizeRow(row);
                      const meta = verdictMeta(verdict);
                      return (
                        <tr key={i} className="border-b border-slate-100 align-top">
                          <td className="py-3 pr-4 font-medium text-ink">{String(requirement)}</td>
                          <td className="py-3 pr-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${meta.badge}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                              {verdict}
                            </span>
                          </td>
                          <td className="py-3 text-steel">{evidence ? String(evidence) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 px-6 pb-6">
                {(analysis.requirements || []).length > 0 && (
                  <div>
                    <h3 className="mb-1 font-medium text-ink">Requirements</h3>
                    <ul className="list-disc pl-5 text-sm text-steel">
                      {analysis.requirements.map((r, i) => (
                        <li key={i} className="py-0.5">
                          {typeof r === 'string' ? r : JSON.stringify(r)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(analysis.absent || []).length > 0 && (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                    <h3 className="mb-1 font-medium text-fill">Absent — will not be added</h3>
                    <ul className="list-disc pl-5 text-sm text-red-700">
                      {analysis.absent.map((a, i) => (
                        <li key={i} className="py-0.5">
                          {typeof a === 'string' ? a : JSON.stringify(a)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <button className="button-secondary" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button className="button h-11 px-6" onClick={runGenerate} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate resume
              </button>
            </div>
          </div>
        )}

        {step === 3 && spec && (
          <div className="space-y-6">
            {cleanWarning && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <strong>Clean copy blocked — placeholders remain:</strong>
                <pre className="mt-2 whitespace-pre-wrap font-mono">{cleanWarning}</pre>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button className="button-secondary" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="flex flex-wrap gap-2">
                <button className="button" onClick={() => downloadDoc(false, 'docx')} disabled={loading}>
                  <Download className="h-4 w-4" /> DOCX (working)
                </button>
                <button className="button" onClick={() => downloadDoc(false, 'pdf')} disabled={loading}>
                  <Download className="h-4 w-4" /> PDF (working)
                </button>
                <button className="button" onClick={() => downloadDoc(true, 'docx')} disabled={loading}>
                  <Download className="h-4 w-4" /> DOCX (clean)
                </button>
                <button className="button" onClick={() => downloadDoc(true, 'pdf')} disabled={loading}>
                  <Download className="h-4 w-4" /> PDF (clean)
                </button>
                <button className="button-secondary" onClick={exportJson}>
                  <FileCode2 className="h-4 w-4" /> Export JSON
                </button>
              </div>
            </div>

            <ResumePreview spec={spec} />
          </div>
        )}
      </main>
    </div>
  );
}
